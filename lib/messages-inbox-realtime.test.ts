import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Lock: /messages stays live in every successful-load state, including an inbox
// with zero threads. A new account's first DM must swap the empty state for the
// thread list via MessageInboxRealtime -> router.refresh(), never a manual reload.

type RpcResult = { data: unknown[] | null; error: { message: string } | null };
const rpc = vi.fn<(name: string) => Promise<RpcResult>>();

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "viewer-1" } } }) },
    rpc: (name: string) => rpc(name),
  }),
}));

vi.mock("@/components/messages/MessageInboxRealtime", () => ({
  default: () => createElement("span", { "data-inbox-realtime": "" }),
}));
vi.mock("@/components/messages/MessageInboxList", () => ({
  default: ({ threads }: { threads: unknown[] }) =>
    createElement("ul", { "data-inbox-list": String(threads.length) }),
}));
vi.mock("@/components/messages/NewMessageFinder", () => ({ default: () => null }));
vi.mock("@/components/messages/NewGroupButton", () => ({ default: () => null }));

async function renderInbox() {
  const { default: MessagesPage } = await import("@/app/(app)/messages/page");
  const tree = await MessagesPage({ searchParams: Promise.resolve({}) });
  return renderToStaticMarkup(tree);
}

const ok = (rows: unknown[]): RpcResult => ({ data: rows, error: null });
const failed: RpcResult = { data: null, error: { message: "boom" } };

describe("/messages inbox realtime", () => {
  beforeEach(() => rpc.mockReset());

  it("empty inbox still mounts MessageInboxRealtime", async () => {
    rpc.mockResolvedValue(ok([]));
    const html = await renderInbox();
    expect(html).toMatch(/data-inbox-realtime/);
    expect(html).not.toMatch(/data-inbox-list/);
    expect(html).toMatch(/href="\/search"/);
  });

  it("populated inbox mounts the list and MessageInboxRealtime", async () => {
    rpc.mockImplementation(async (name) =>
      name === "list_dm_inbox"
        ? ok([{ conversation_id: "c1", last_message_at: "2026-09-18T00:00:00Z" }])
        : ok([]),
    );
    const html = await renderInbox();
    expect(html).toMatch(/data-inbox-list="1"/);
    expect(html).toMatch(/data-inbox-realtime/);
  });

  it("failed load shows the retry state without a subscription", async () => {
    rpc.mockImplementation(async (name) => (name === "list_dm_inbox" ? failed : ok([])));
    const html = await renderInbox();
    expect(html).toMatch(/href="\/messages"/);
    expect(html).not.toMatch(/data-inbox-realtime/);
  });
});
