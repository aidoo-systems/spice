import type {
  CookedResponse,
  FeedbackRequest,
  FeedbackResponse,
  FollowupRequest,
  SuggestRequest,
  SuggestResponse,
} from "./types";
import { parseSSE } from "./sse";
import { normalizePlan } from "./plan";

const REQUEST_TIMEOUT_MS = 20_000;
/** A stream is only abandoned if the server goes quiet this long. */
const STREAM_IDLE_MS = 45_000;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Map a failed response to something a person can act on. */
export function friendlyError(status: number, detail?: unknown): string {
  // The API's own 429/503/504/502 details are already written for users.
  if (typeof detail === "string" && detail.length < 200 && [429, 502, 503, 504].includes(status)) {
    return detail;
  }
  if (status === 422) return "Some of those inputs are too long or not valid. Try shortening them.";
  if (status === 429) return "You've cooked up a lot today. Try again a bit later.";
  if (status === 503) return "SPICE is taking a break right now. Try again later.";
  if (status === 504) return "SPICE took too long thinking about this one. Try again.";
  if (status >= 500) return "Something went wrong on our side. Try again in a moment.";
  return "Something went wrong. Try again.";
}

async function errorFrom(res: Response): Promise<ApiError> {
  let detail: unknown;
  try {
    detail = (await res.json()).detail;
  } catch {
    // non-JSON error body
  }
  return new ApiError(res.status, friendlyError(res.status, detail));
}

async function post(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "Couldn't reach SPICE. Check your connection and try again.");
  }
}

export interface StreamHandlers {
  onPartial?: (plan: SuggestResponse) => void;
  signal?: AbortSignal;
}

/** POST and consume an SSE plan stream; resolves with the final plan. */
async function streamPlan(url: string, body: unknown, { onPartial, signal }: StreamHandlers): Promise<SuggestResponse> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  let idle = setTimeout(abort, STREAM_IDLE_MS);
  const bump = () => {
    clearTimeout(idle);
    idle = setTimeout(abort, STREAM_IDLE_MS);
  };

  try {
    const res = await post(url, body, controller.signal);
    if (!res.ok || !res.body) throw await errorFrom(res);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bump();
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSSE(buffer);
      buffer = rest;
      for (const ev of events) {
        const data = JSON.parse(ev.data);
        if (ev.event === "partial") onPartial?.(normalizePlan(data));
        else if (ev.event === "final") return normalizePlan(data);
        else if (ev.event === "error") throw new ApiError(data.status ?? 500, data.message ?? friendlyError(500));
      }
    }
    throw new ApiError(502, "The connection closed before the plan finished. Try again.");
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      if (signal?.aborted) throw err;
      throw new ApiError(504, "SPICE went quiet for too long. Try again.");
    }
    throw err;
  } finally {
    clearTimeout(idle);
    signal?.removeEventListener("abort", abort);
  }
}

export function streamSuggestion(req: SuggestRequest, handlers: StreamHandlers = {}): Promise<SuggestResponse> {
  return streamPlan("/api/v1/suggest/stream", req, handlers);
}

export function streamFollowup(req: FollowupRequest, handlers: StreamHandlers = {}): Promise<SuggestResponse> {
  return streamPlan("/api/v1/followup/stream", req, handlers);
}

async function postSmall<T>(url: string, body: unknown): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await post(url, body, controller.signal);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function submitFeedback(req: FeedbackRequest): Promise<FeedbackResponse | null> {
  return postSmall<FeedbackResponse>("/api/v1/feedback", req);
}

export function markCooked(comboSignature: string): Promise<CookedResponse | null> {
  return postSmall<CookedResponse>("/api/v1/cooked", { combo_signature: comboSignature });
}
