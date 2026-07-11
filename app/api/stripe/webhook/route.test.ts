import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ---- Hoisted mock state (vi.mock factories run before imports, so shared
// mutable fakes must be created via vi.hoisted) ----

const { stripeMocks } = vi.hoisted(() => {
  return {
    stripeMocks: {
      constructEvent: vi.fn(),
      retrieve: vi.fn(),
    },
  };
});

type Call = { table: string; method: string; args: any[] }; // eslint-disable-line @typescript-eslint/no-explicit-any

const { fakeAdmin } = vi.hoisted(() => {
  function createFakeAdminClient() {
    const calls: Call[] = []; // eslint-disable-line no-undef
    let insertResult: { error: unknown } = { error: null };
    let updateResult: { error: unknown } = { error: null };

    // Chainable + awaitable query builder. Each call records itself; awaiting
    // the chain resolves to whatever result was staged by insert()/update().
    function makeBuilder(table: string) {
      const builder: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
        insert(args: unknown) {
          calls.push({ table, method: "insert", args: [args] });
          builder._result = insertResult;
          return builder;
        },
        update(args: unknown) {
          calls.push({ table, method: "update", args: [args] });
          builder._result = updateResult;
          return builder;
        },
        eq(...args: unknown[]) {
          calls.push({ table, method: "eq", args });
          return builder;
        },
        or(...args: unknown[]) {
          calls.push({ table, method: "or", args });
          return builder;
        },
        then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
          return Promise.resolve(builder._result ?? { error: null }).then(resolve, reject);
        },
      };
      return builder;
    }

    return {
      from(table: string) {
        return makeBuilder(table);
      },
      calls,
      setInsertResult(r: { error: unknown }) {
        insertResult = r;
      },
      setUpdateResult(r: { error: unknown }) {
        updateResult = r;
      },
      reset() {
        calls.length = 0;
        insertResult = { error: null };
        updateResult = { error: null };
      },
    };
  }

  return { fakeAdmin: createFakeAdminClient() };
});

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: stripeMocks.constructEvent },
    subscriptions: { retrieve: stripeMocks.retrieve },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => fakeAdmin,
}));

vi.mock("@/lib/posthog-server", () => ({
  getPostHogServerClient: () => null,
}));

const { POST } = await import("./route");

// ---- Test event builders ----

let eventCounter = 0;
function nextId() {
  eventCounter += 1;
  return `evt_${eventCounter}`;
}

function makeCheckoutSessionEvent(overrides: {
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
  mode?: "payment" | "subscription";
  payment_status?: string;
  created: number;
  customer?: string;
  subscription?: string;
}) {
  return {
    id: nextId(),
    type: "checkout.session.completed",
    created: overrides.created,
    data: {
      object: {
        client_reference_id: overrides.client_reference_id ?? null,
        metadata: overrides.metadata ?? {},
        mode: overrides.mode ?? "payment",
        payment_status: overrides.payment_status ?? "paid",
        created: overrides.created,
        customer: overrides.customer,
        subscription: overrides.subscription,
      },
    },
  };
}

function makeSubscriptionEvent(opts: {
  type: "customer.subscription.updated" | "customer.subscription.deleted";
  customerId: string;
  status: string;
  created: number;
}) {
  return {
    id: nextId(),
    type: opts.type,
    created: opts.created,
    data: {
      object: {
        customer: opts.customerId,
        status: opts.status,
        items: { data: [{ current_period_end: opts.created + 1000 }] },
      },
    },
  };
}

// ---- Request helper ----

function buildRequest(hasSignature = true) {
  const headers: Record<string, string> = {};
  if (hasSignature) headers["stripe-signature"] = "t=1,v1=x";
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: "{}",
    headers,
  });
}

async function post(event: unknown, opts?: { signature?: boolean }) {
  stripeMocks.constructEvent.mockReturnValue(event);
  return POST(buildRequest(opts?.signature ?? true));
}

beforeEach(() => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  fakeAdmin.reset();
  stripeMocks.constructEvent.mockReset();
  stripeMocks.retrieve.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("POST /api/stripe/webhook — entry guards", () => {
  it("returns 503 when STRIPE_WEBHOOK_SECRET is unset", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const res = await post(makeCheckoutSessionEvent({ created: 1770000000 }));
    expect(res.status).toBe(503);
  });

  it("returns 400 when the stripe-signature header is missing", async () => {
    const res = await post(makeCheckoutSessionEvent({ created: 1770000000 }), {
      signature: false,
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when constructEvent throws", async () => {
    stripeMocks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await POST(buildRequest());
    expect(res.status).toBe(400);
  });
});

describe("POST /api/stripe/webhook — replay idempotency", () => {
  it("returns 200 duplicate on a unique-violation insert, without touching profiles", async () => {
    fakeAdmin.setInsertResult({ error: { code: "23505" } });
    const res = await post(
      makeCheckoutSessionEvent({
        client_reference_id: "user-1",
        metadata: { supabase_id: "user-1" },
        mode: "payment",
        payment_status: "paid",
        created: 1770000000,
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(fakeAdmin.calls.some((c) => c.table === "profiles")).toBe(false);
  });

  it("returns 500 on a non-duplicate dedupe insert error", async () => {
    fakeAdmin.setInsertResult({ error: { code: "XXXXX", message: "db down" } });
    const res = await post(
      makeCheckoutSessionEvent({
        client_reference_id: "user-1",
        metadata: { supabase_id: "user-1" },
        mode: "payment",
        payment_status: "paid",
        created: 1770000000,
      })
    );
    expect(res.status).toBe(500);
  });
});

describe("POST /api/stripe/webhook — checkout.session.completed", () => {
  it("rejects a session whose metadata.supabase_id does not match client_reference_id", async () => {
    const res = await post(
      makeCheckoutSessionEvent({
        client_reference_id: "user-1",
        metadata: {},
        mode: "payment",
        payment_status: "paid",
        created: 1770000000,
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Unverified session subject");
    expect(fakeAdmin.calls.some((c) => c.table === "profiles" && c.method === "update")).toBe(
      false
    );
  });

  it("ignores an unpaid session", async () => {
    const res = await post(
      makeCheckoutSessionEvent({
        client_reference_id: "user-1",
        metadata: { supabase_id: "user-1" },
        mode: "payment",
        payment_status: "unpaid",
        created: 1770000000,
      })
    );
    expect(res.status).toBe(200);
    expect(fakeAdmin.calls.some((c) => c.table === "profiles" && c.method === "update")).toBe(
      false
    );
  });

  it("treats no_payment_required as paid", async () => {
    const res = await post(
      makeCheckoutSessionEvent({
        client_reference_id: "user-1",
        metadata: { supabase_id: "user-1" },
        mode: "payment",
        payment_status: "no_payment_required",
        created: 1770000000,
      })
    );
    expect(res.status).toBe(200);
    expect(fakeAdmin.calls.some((c) => c.table === "profiles" && c.method === "update")).toBe(
      true
    );
  });

  it("anchors one-time-purchase pro_until to session.created, not Date.now()", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));

    const created = 1770000000;
    const res = await post(
      makeCheckoutSessionEvent({
        client_reference_id: "user-1",
        metadata: { supabase_id: "user-1" },
        mode: "payment",
        payment_status: "paid",
        created,
      })
    );
    expect(res.status).toBe(200);

    const expected = new Date(created * 1000);
    expected.setMonth(expected.getMonth() + 6);

    const update = fakeAdmin.calls.find((c) => c.table === "profiles" && c.method === "update");
    expect(update?.args[0]).toMatchObject({
      is_pro: true,
      pro_source: "one_time",
      pro_until: expected.toISOString(),
    });
  });

  it("subscription-mode checkout retrieves the subscription and stamps pro_source: subscription", async () => {
    stripeMocks.retrieve.mockResolvedValue({
      items: { data: [{ current_period_end: 1780000000 }] },
    });
    const res = await post(
      makeCheckoutSessionEvent({
        client_reference_id: "user-1",
        metadata: { supabase_id: "user-1" },
        mode: "subscription",
        payment_status: "paid",
        created: 1770000000,
        customer: "cus_1",
        subscription: "sub_1",
      })
    );
    expect(res.status).toBe(200);
    expect(stripeMocks.retrieve).toHaveBeenCalledWith("sub_1");

    const update = fakeAdmin.calls.find((c) => c.table === "profiles" && c.method === "update");
    expect(update?.args[0]).toMatchObject({
      stripe_customer_id: "cus_1",
      is_pro: true,
      pro_source: "subscription",
    });

    const idFilter = fakeAdmin.calls.find(
      (c) => c.table === "profiles" && c.method === "eq" && c.args[0] === "id"
    );
    expect(idFilter?.args[1]).toBe("user-1");
  });
});

describe("POST /api/stripe/webhook — subscription tie-break asymmetry", () => {
  it("customer.subscription.deleted revokes pro and guards with .lte. (wins same-second tie)", async () => {
    const res = await post(
      makeSubscriptionEvent({
        type: "customer.subscription.deleted",
        customerId: "cus_1",
        status: "canceled",
        created: 1770000000,
      })
    );
    expect(res.status).toBe(200);

    const update = fakeAdmin.calls.find((c) => c.table === "profiles" && c.method === "update");
    expect(update?.args[0]).toMatchObject({ is_pro: false });

    const or = fakeAdmin.calls.find((c) => c.table === "profiles" && c.method === "or");
    expect(String(or?.args[0])).toContain(".lte.");

    const sourceFilter = fakeAdmin.calls.find(
      (c) => c.table === "profiles" && c.method === "eq" && c.args[0] === "pro_source"
    );
    expect(sourceFilter?.args[1]).toBe("subscription");
  });

  it("customer.subscription.updated(active) grants pro and guards with .lt. (loses same-second tie)", async () => {
    const res = await post(
      makeSubscriptionEvent({
        type: "customer.subscription.updated",
        customerId: "cus_1",
        status: "active",
        created: 1770000000,
      })
    );
    expect(res.status).toBe(200);

    const update = fakeAdmin.calls.find((c) => c.table === "profiles" && c.method === "update");
    expect(update?.args[0]).toMatchObject({ is_pro: true });

    const or = fakeAdmin.calls.find((c) => c.table === "profiles" && c.method === "or");
    expect(String(or?.args[0])).toContain(".lt.");
    expect(String(or?.args[0])).not.toContain(".lte.");
  });

  it("customer.subscription.updated(canceled) revokes pro", async () => {
    const res = await post(
      makeSubscriptionEvent({
        type: "customer.subscription.updated",
        customerId: "cus_1",
        status: "canceled",
        created: 1770000000,
      })
    );
    expect(res.status).toBe(200);

    const update = fakeAdmin.calls.find((c) => c.table === "profiles" && c.method === "update");
    expect(update?.args[0]).toMatchObject({ is_pro: false });
  });
});
