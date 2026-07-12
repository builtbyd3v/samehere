import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ---- Hoisted mock state (vi.mock factories run before imports, so shared
// mutable fakes must be created via vi.hoisted) ----

const { rpcMock, sendEmailMock, cachedPromptsMock, aiEnabledMock, generateTextMock, modelForTierMock, insertCalls } =
  vi.hoisted(() => ({
    rpcMock: vi.fn(),
    sendEmailMock: vi.fn(),
    cachedPromptsMock: vi.fn(),
    aiEnabledMock: vi.fn(),
    generateTextMock: vi.fn(),
    modelForTierMock: vi.fn(),
    insertCalls: [] as Array<{ table: string; args: unknown }>,
  }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: rpcMock,
    from: (table: string) => ({
      insert: (args: unknown) => {
        insertCalls.push({ table, args });
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/connection-prompt", () => ({
  cachedConnectionPrompts: cachedPromptsMock,
}));

vi.mock("@/lib/ai", () => ({
  aiEnabled: aiEnabledMock,
  generateText: generateTextMock,
  modelForTier: modelForTierMock,
}));

const { GET } = await import("./route");

function buildRequest(auth?: string) {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/weekly-matches", { headers }) as never;
}

type RecipientRow = {
  user_id: string;
  email: string;
  is_pro: boolean;
  pro_until: string | null;
  year: string | null;
  major: string | null;
  goals: string | null;
  bio: string | null;
  school: string | null;
};

type CandidateRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  school: string | null;
  year: string | null;
  major: string | null;
  goals: string | null;
  bio: string | null;
};

function makeRecipient(overrides: Partial<RecipientRow> = {}): RecipientRow {
  return {
    user_id: "u1",
    email: "u1@example.com",
    is_pro: false,
    pro_until: null,
    year: null,
    major: null,
    goals: null,
    bio: null,
    school: null,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<CandidateRow> = {}): CandidateRow {
  return {
    id: "c1",
    username: "cand",
    display_name: "Cand",
    avatar_url: null,
    school: null,
    year: null,
    major: null,
    goals: null,
    bio: null,
    ...overrides,
  };
}

// Two RPCs are called on this route: list_weekly_match_recipients (no args)
// and get_match_candidates (per recipient). Route to fixed data by name.
let recipientsData: RecipientRow[] = [];
let candidatesData: CandidateRow[] = [];

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron-test-secret");
  vi.stubEnv("EMAIL_UNSUB_SECRET", "unsub-test-secret");

  recipientsData = [];
  candidatesData = [];
  insertCalls.length = 0;

  rpcMock.mockReset();
  rpcMock.mockImplementation((name: string) => {
    if (name === "list_weekly_match_recipients") return Promise.resolve({ data: recipientsData, error: null });
    if (name === "get_match_candidates") return Promise.resolve({ data: candidatesData, error: null });
    return Promise.resolve({ data: [], error: null });
  });

  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue(undefined);

  cachedPromptsMock.mockReset();
  cachedPromptsMock.mockResolvedValue(new Map<string, string>());

  aiEnabledMock.mockReset();
  aiEnabledMock.mockReturnValue(false);

  generateTextMock.mockReset();
  generateTextMock.mockResolvedValue(null);

  modelForTierMock.mockReset();
  modelForTierMock.mockReturnValue("test-model");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/weekly-matches — auth guard", () => {
  it("returns 401 without the Bearer header", async () => {
    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns 401 with the wrong secret", async () => {
    const res = await GET(buildRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with the correct Bearer header", async () => {
    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("list_weekly_match_recipients");
  });

  it("returns 401 and never calls the RPC when CRON_SECRET is unset (fail-closed)", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const res = await GET(buildRequest("Bearer undefined"));
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the header is a different length than expected", async () => {
    const res = await GET(buildRequest("Bearer short"));
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/weekly-matches — batched prompt-cache lookup", () => {
  it("calls cachedConnectionPrompts once per Pro recipient with all candidate ids batched, not once per candidate", async () => {
    recipientsData = [
      makeRecipient({ user_id: "pro-1", email: "pro1@example.com", is_pro: true, major: "Computer Science" }),
    ];
    candidatesData = [
      makeCandidate({ id: "c1", major: "Computer Science" }),
      makeCandidate({ id: "c2", major: "Computer Science" }),
      makeCandidate({ id: "c3", major: "Computer Science" }),
      makeCandidate({ id: "c4", major: "Computer Science" }),
      makeCandidate({ id: "c5", major: "Computer Science" }),
    ];

    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);

    expect(cachedPromptsMock).toHaveBeenCalledTimes(1);
    const [, viewerId, candidateIds] = cachedPromptsMock.mock.calls[0];
    expect(viewerId).toBe("pro-1");
    expect(candidateIds).toEqual(expect.arrayContaining(["c1", "c2", "c3", "c4", "c5"]));
    expect(candidateIds).toHaveLength(5);
  });

  it("does not call cachedConnectionPrompts for non-Pro recipients", async () => {
    recipientsData = [makeRecipient({ user_id: "free-1", is_pro: false })];
    candidatesData = [makeCandidate({ id: "c1" })];

    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);
    expect(cachedPromptsMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/weekly-matches — MAX_AI_RECIPIENTS ceiling", () => {
  it("caps generateText calls at MAX_AI_RECIPIENTS plus the documented BATCH_SIZE overshoot", async () => {
    // 20 Pro recipients x 5 cache-missing, fact-sharing candidates each =
    // up to 100 potential AI calls, well past the 50-call cap.
    recipientsData = Array.from({ length: 20 }, (_, i) =>
      makeRecipient({ user_id: `pro-${i}`, email: `pro${i}@example.com`, is_pro: true, major: "Computer Science" })
    );
    candidatesData = Array.from({ length: 5 }, (_, i) => makeCandidate({ id: `cand-${i}`, major: "Computer Science" }));

    aiEnabledMock.mockReturnValue(true);
    generateTextMock.mockResolvedValue("AI generated reason");
    cachedPromptsMock.mockResolvedValue(new Map<string, string>()); // every candidate cache-misses

    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);

    // MAX_AI_RECIPIENTS = 50, BATCH_SIZE = 5 — code's own documented tolerance.
    expect(generateTextMock.mock.calls.length).toBeGreaterThan(0);
    expect(generateTextMock.mock.calls.length).toBeLessThanOrEqual(55);
  });
});

describe("GET /api/cron/weekly-matches — recipient cap", () => {
  it("reports the full recipient count in total while capping sends at MAX_RECIPIENTS", async () => {
    recipientsData = Array.from({ length: 250 }, (_, i) =>
      makeRecipient({ user_id: `u-${i}`, email: `u${i}@example.com`, is_pro: false })
    );
    candidatesData = [makeCandidate({ id: "c1" }), makeCandidate({ id: "c2" }), makeCandidate({ id: "c3" })];

    const res = await GET(buildRequest("Bearer cron-test-secret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(250);
    expect(json.sent).toBeLessThanOrEqual(200);
    expect(sendEmailMock.mock.calls.length).toBeLessThanOrEqual(200);
  });
});
