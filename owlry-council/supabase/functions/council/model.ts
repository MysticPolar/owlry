// Thin adapter over the Claude Messages API (fetch only, no SDK).
// - complete(): non-streaming, used for JSON steps (cast, forge, summary, route)
// - stream():   streaming, used for mind turns; calls onDelta with text as it arrives
// - prewarm():  writes the prompt cache for a system prompt before it is needed
// Docs: https://platform.claude.com/docs/en/api/messages
//       https://platform.claude.com/docs/en/build-with-claude/prompt-caching
//       https://platform.claude.com/docs/en/build-with-claude/effort
//       https://platform.claude.com/docs/en/build-with-claude/thinking

import type { Usage } from "./types.ts";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

// Sonnet 5 / Opus 5 / Fable / Mythos / Opus 4.7+ reject non-default temperature,
// top_p and top_k on every request. Haiku 4.5 and older accept them (thinking off).
const NO_SAMPLING_PARAMS = /claude-(fable|mythos|opus-5|sonnet-5|opus-4-[78])/;
// Fable and Mythos cannot turn thinking off.
const THINKING_ALWAYS_ON = /claude-(fable|mythos)/;
// Models where thinking is on by default (adaptive) unless disabled.
const THINKING_DEFAULT_ON = /claude-(fable|mythos|opus-5|sonnet-5)/;

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface CallOptions {
  model: string;
  system: string;
  messages: Message[];
  maxTokens: number;
  /** Ignored on models that reject sampling params (see NO_SAMPLING_PARAMS). */
  temperature?: number;
  /** "low" for chat-length turns; omitted on Haiku 4.5 (unsupported there). */
  effort?: "low" | "medium" | "high";
  /** "disabled" turns thinking off where the model allows it; "default" leaves the model's default. */
  thinking?: "disabled" | "default";
  /** Put a cache breakpoint on the system prompt (min 1,024 tokens on Sonnet 5). */
  cacheSystem?: boolean;
}

export interface CallResult {
  text: string;
  usage: Usage;
}

function apiKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}

/** Build the request body. The same shape is used for real calls and for cache pre-warming,
 *  because thinking config and effort are rendered into the prompt and must match for a cache hit. */
function buildBody(o: CallOptions, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: o.model,
    max_tokens: o.maxTokens,
    system: o.cacheSystem
      ? [{ type: "text", text: o.system, cache_control: { type: "ephemeral" } }]
      : o.system,
    messages: o.messages,
  };
  if (o.temperature !== undefined && !NO_SAMPLING_PARAMS.test(o.model)) body.temperature = o.temperature;
  if (o.effort && !/claude-haiku/.test(o.model)) body.output_config = { effort: o.effort };
  if (o.thinking === "disabled" && THINKING_DEFAULT_ON.test(o.model) && !THINKING_ALWAYS_ON.test(o.model)) {
    body.thinking = { type: "disabled" };
  }
  if (stream) body.stream = true;
  return body;
}

async function post(body: Record<string, unknown>): Promise<Response> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey(),
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${detail.slice(0, 500)}`);
  }
  return res;
}

/** Non-streaming call. Returns concatenated text blocks. */
export async function complete(o: CallOptions): Promise<CallResult> {
  const res = await post(buildBody(o, false));
  const json = await res.json();
  const text = (json.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  return { text, usage: json.usage ?? {} };
}

/** Streaming call. onDelta receives text fragments; resolves with the full text. */
export async function stream(
  o: CallOptions,
  onDelta: (text: string) => void,
): Promise<CallResult> {
  const res = await post(buildBody(o, true));
  if (!res.body) throw new Error("No response body from Claude API");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  const usage: Usage = {};

  const handleEvent = (data: string) => {
    if (!data || data === "[DONE]") return;
    let evt: {
      type: string;
      delta?: { type?: string; text?: string };
      message?: { usage?: Usage };
      usage?: Usage;
      error?: { message?: string };
    };
    try {
      evt = JSON.parse(data);
    } catch {
      return;
    }
    switch (evt.type) {
      case "content_block_delta":
        // thinking_delta events (if any) are ignored on purpose; only text reaches the reader
        if (evt.delta?.type === "text_delta" && evt.delta.text) {
          full += evt.delta.text;
          onDelta(evt.delta.text);
        }
        break;
      case "message_start":
        Object.assign(usage, evt.message?.usage ?? {});
        break;
      case "message_delta":
        Object.assign(usage, evt.usage ?? {});
        break;
      case "error":
        throw new Error(`Claude stream error: ${evt.error?.message ?? "unknown"}`);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trimEnd();
      buffer = buffer.slice(idx + 1);
      if (line.startsWith("data:")) handleEvent(line.slice(5).trim());
    }
  }
  return { text: full, usage };
}

/** Pre-warm the prompt cache for a system prompt (max_tokens: 0 → no output billed).
 *  Pass the same effort/thinking options the real calls will use, or the entry won't be hit. */
export async function prewarm(o: Omit<CallOptions, "messages" | "maxTokens">): Promise<void> {
  try {
    const body = buildBody(
      { ...o, cacheSystem: true, messages: [{ role: "user", content: "warmup" }], maxTokens: 0 },
      false,
    );
    await post(body);
  } catch (_) {
    // best effort only
  }
}

/** Extract the first JSON object from model text (tolerates code fences and prose). */
export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`No JSON object in model output: ${cleaned.slice(0, 200)}`);
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
