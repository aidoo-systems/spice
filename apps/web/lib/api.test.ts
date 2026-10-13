import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, friendlyError, streamSuggestion } from "./api";

function sseResponse(chunks: string[], status = 200): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { "Content-Type": "text/event-stream" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("friendlyError", () => {
  it("passes through the API's user-facing messages", () => {
    expect(friendlyError(429, "Slow down")).toBe("Slow down");
    expect(friendlyError(503, "Budget spent")).toBe("Budget spent");
  });

  it("never shows raw validation detail", () => {
    expect(friendlyError(422, [{ loc: ["body"], msg: "bad" }])).toMatch(/too long or not valid/);
    expect(friendlyError(500, "Traceback ...")).toMatch(/on our side/);
  });
});

describe("streamSuggestion", () => {
  it("emits partials and resolves with the final plan", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([
      'event: partial\ndata: {"title":"Ri"}\n\n',
      'event: partial\ndata: {"title":"Rice"}\n\nevent: fi',
      'nal\ndata: {"title":"Rice bowl","steps":[]}\n\n',
    ])));
    const partials: string[] = [];
    const final = await streamSuggestion({ ingredients: ["rice"] }, { onPartial: (p) => partials.push(p.title) });
    expect(partials).toEqual(["Ri", "Rice"]);
    expect(final.title).toBe("Rice bowl");
  });

  it("turns an error event into an ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(['event: error\ndata: {"status":504,"message":"Too slow"}\n\n'])));
    await expect(streamSuggestion({ ingredients: ["rice"] })).rejects.toMatchObject({ status: 504, message: "Too slow" });
  });

  it("maps HTTP errors before the stream starts", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "Rate limited" }), { status: 429 })));
    const err = await streamSuggestion({ ingredients: ["rice"] }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Rate limited");
  });

  it("reports a stream that ends without a final event", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(['event: partial\ndata: {"title":"x"}\n\n'])));
    await expect(streamSuggestion({ ingredients: ["rice"] })).rejects.toMatchObject({ status: 502 });
  });

  it("reports network failures in plain words", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await expect(streamSuggestion({ ingredients: ["rice"] })).rejects.toThrow(/Couldn't reach SPICE/);
  });
});
