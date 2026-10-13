import { describe, expect, it } from "vitest";
import { parseSSE } from "./sse";

describe("parseSSE", () => {
  it("parses complete events and keeps the incomplete tail", () => {
    const { events, rest } = parseSSE('event: partial\ndata: {"a":1}\n\nevent: final\ndata: {"b"');
    expect(events).toEqual([{ event: "partial", data: '{"a":1}' }]);
    expect(rest).toBe('event: final\ndata: {"b"');
  });

  it("handles CRLF and multi-line data", () => {
    const { events } = parseSSE("event: x\r\ndata: one\r\ndata: two\r\n\r\n");
    expect(events).toEqual([{ event: "x", data: "one\ntwo" }]);
  });

  it("defaults the event name and skips data-less blocks", () => {
    const { events } = parseSSE(": comment\n\ndata: hi\n\n");
    expect(events).toEqual([{ event: "message", data: "hi" }]);
  });

  it("reassembles events split across chunks", () => {
    let buffer = "";
    const seen: string[] = [];
    for (const chunk of ["event: fin", "al\ndata: {\"ok\":", "true}\n", "\n"]) {
      const { events, rest } = parseSSE(buffer + chunk);
      buffer = rest;
      seen.push(...events.map((e) => e.data));
    }
    expect(seen).toEqual(['{"ok":true}']);
  });
});
