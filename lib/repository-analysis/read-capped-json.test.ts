import { describe, expect, it } from "vitest";
import { ANALYSIS_POST_MAX_BYTES, readCappedJson } from "./read-capped-json";

describe("readCappedJson", () => {
  it("parses a small object and rejects an oversized Content-Length", async () => {
    expect(
      await readCappedJson(
        new Request("http://localhost/x", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repositoryId: 99 }),
        })
      )
    ).toEqual({ repositoryId: 99 });
    expect(
      await readCappedJson(
        new Request("http://localhost/x", {
          method: "POST",
          headers: { "content-length": String(ANALYSIS_POST_MAX_BYTES + 1) },
          body: "x".repeat(ANALYSIS_POST_MAX_BYTES + 1),
        })
      )
    ).toBeUndefined();
  });

  it("cancels the stream once the byte cap is exceeded", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{\"repositoryId\":"));
        controller.enqueue(new TextEncoder().encode("1".repeat(ANALYSIS_POST_MAX_BYTES)));
        controller.close();
      },
    });
    const init: RequestInit & { duplex: "half" } = { method: "POST", body, duplex: "half" };
    expect(await readCappedJson(new Request("http://localhost/x", init))).toBeUndefined();
  });
});
