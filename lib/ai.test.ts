import { describe, it, expect, beforeEach, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function OpenAI() {
    return { chat: { completions: { create: createMock } } };
  }),
}));

describe("generateText — retry once without temperature", () => {
  beforeEach(() => {
    vi.resetModules();
    createMock.mockReset();
    process.env.OPENAI_API_KEY = "test";
    process.env.OPENAI_MODEL = "m";
  });

  it("retries without temperature on failure and returns the second call's text", async () => {
    createMock.mockRejectedValueOnce(new Error("temperature is deprecated for this model"));
    createMock.mockResolvedValueOnce({ choices: [{ message: { content: "hi" } }] });
    const { generateText } = await import("@/lib/ai");

    const result = await generateText("sys", "prompt", { temperature: 0.3 });

    expect(result).toBe("hi");
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock.mock.calls[0][0]).toMatchObject({ temperature: 0.3 });
    expect(createMock.mock.calls[1][0]).not.toHaveProperty("temperature");
  });

  it("returns null after one failed call when no temperature was requested", async () => {
    createMock.mockRejectedValueOnce(new Error("boom"));
    const { generateText } = await import("@/lib/ai");

    const result = await generateText("sys", "prompt");

    expect(result).toBeNull();
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when both the temperature call and the retry fail", async () => {
    createMock.mockRejectedValueOnce(new Error("fail 1"));
    createMock.mockRejectedValueOnce(new Error("fail 2"));
    const { generateText } = await import("@/lib/ai");

    const result = await generateText("sys", "prompt", { temperature: 0.5 });

    expect(result).toBeNull();
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
