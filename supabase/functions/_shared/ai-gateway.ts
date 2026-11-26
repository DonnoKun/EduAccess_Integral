/**
 * S4 AI Orchestration — resilient gateway shared by every AI edge function.
 * Timeout + retry with jittered backoff + primary/secondary adapters behind one
 * interface + Postgres-backed circuit breaker + cache degradation + metrics.
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export const CONFIG = {
  timeoutMs: Number(Deno.env.get("AI_TIMEOUT_MS") ?? 20000),
  maxRetries: 2,
  failureThreshold: Number(Deno.env.get("AI_BREAKER_THRESHOLD") ?? 5),
  cooldownMs: Number(Deno.env.get("AI_BREAKER_COOLDOWN_MS") ?? 30000),
  primaryModel: Deno.env.get("AI_PRIMARY_MODEL") ?? "google/gemini-3-flash-preview",
  secondaryModel: Deno.env.get("AI_SECONDARY_MODEL") ?? "openai/gpt-6.1-terra",
};

export type Path = "primary" | "secondary" | "cache" | "failed";
export interface ChatRequest { messages: unknown[]; tools?: unknown[]; tool_choice?: unknown; modalities?: string[]; [k: string]: unknown }
export interface AIResult { data: any; path: Path; provider: string | null; degraded: boolean; status: number }
export class TransientError extends Error { constructor(msg: string, public status = 0) { super(msg); } }
export class TerminalError extends Error { constructor(msg: string, public status: number) { super(msg); } }

/** Adapter interface: every provider exposes the same call. */
export interface ProviderAdapter { name: string; call(req: ChatRequest, signal: AbortSignal): Promise<{ json: any; status: number }> }

export function gatewayAdapter(model: string): ProviderAdapter {
  return {
    name: model,
    async call(req, signal) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", signal,
        headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, model }),
      });
      if (r.ok) return { json: await r.json(), status: r.status };
      const text = await r.text().catch(() => "");
      if (r.status >= 500 || r.status === 429) throw new TransientError(`${model} ${r.status}`, r.status);
      if (r.status === 402) throw new TerminalError("AI credits exhausted", 402);
      // 400/404 (e.g. invalid model id) → this provider is unusable: treat as failure for fallback
      throw new TransientError(`${model} ${r.status} ${text.slice(0, 120)}`, r.status);
    },
  };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const backoff = (attempt: number, base = 400) => base * 2 ** attempt + Math.floor(Math.random() * base);

/** Timeout + retry wrapper around one adapter. */
export async function callWithRetry(adapter: ProviderAdapter, req: ChatRequest, opts = { timeoutMs: CONFIG.timeoutMs, maxRetries: CONFIG.maxRetries, sleepFn: sleep }) {
  let last: unknown;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs);
    try {
      return await adapter.call(req, ctrl.signal);
    } catch (e) {
      if (e instanceof TerminalError) throw e;
      last = (e as Error)?.name === "AbortError" ? new TransientError("timeout", 504) : e;
      // a 4xx other than 429 won't fix itself on retry
      const st = (last as TransientError).status ?? 0;
      if (st >= 400 && st < 500 && st !== 429) break;
      if (attempt < opts.maxRetries) await opts.sleepFn(backoff(attempt));
    } finally { clearTimeout(t); }
  }
  throw last;
}

/* ---------- Circuit breaker (shared state in Postgres) ---------- */
export interface BreakerRow { service: string; state: "CLOSED" | "OPEN" | "HALF_OPEN"; consecutive_failures: number; opened_at: string | null }

/** Pure decision: may we try the primary now? Returns next state to persist if it changes. */
export function breakerDecision(row: BreakerRow | null, now: number, cooldownMs = CONFIG.cooldownMs): { allow: boolean; transitionTo?: "HALF_OPEN" } {
  if (!row || row.state === "CLOSED") return { allow: true };
  if (row.state === "OPEN") {
    const opened = row.opened_at ? Date.parse(row.opened_at) : 0;
    return now - opened >= cooldownMs ? { allow: true, transitionTo: "HALF_OPEN" } : { allow: false };
  }
  return { allow: false }; // HALF_OPEN trial already in flight
}
export function breakerAfter(row: BreakerRow | null, success: boolean, threshold = CONFIG.failureThreshold, nowIso = new Date().toISOString()): Omit<BreakerRow, "service"> {
  if (success) return { state: "CLOSED", consecutive_failures: 0, opened_at: null };
  const failures = (row?.consecutive_failures ?? 0) + 1;
  if (row?.state === "HALF_OPEN" || failures >= threshold) return { state: "OPEN", consecutive_failures: failures, opened_at: nowIso };
  return { state: "CLOSED", consecutive_failures: failures, opened_at: row?.opened_at ?? null };
}

let _admin: SupabaseClient | null = null;
export const admin = () => (_admin ??= createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } }));

async function readBreaker(service: string): Promise<BreakerRow | null> {
  const { data } = await admin().from("circuit_breaker_state").select("*").eq("service", service).maybeSingle();
  return data as BreakerRow | null;
}
async function writeBreaker(service: string, s: Omit<BreakerRow, "service">) {
  await admin().from("circuit_breaker_state").upsert({ service, ...s, updated_at: new Date().toISOString() });
}
/** Atomic OPEN→HALF_OPEN so only one invocation gets the trial. */
async function claimHalfOpen(service: string, openedAt: string | null): Promise<boolean> {
  let q = admin().from("circuit_breaker_state").update({ state: "HALF_OPEN", updated_at: new Date().toISOString() }).eq("service", service).eq("state", "OPEN");
  if (openedAt) q = q.eq("opened_at", openedAt);
  const { data } = await q.select("service");
  return (data?.length ?? 0) > 0;
}

export async function hashRequest(fn: string, req: unknown): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fn + JSON.stringify(req)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function logMetric(m: Record<string, unknown>) {
  // The RPC matches the existing partial expression index and uses ON CONFLICT DO NOTHING.
  const { error } = m.batch_run_id
    ? await admin().rpc("persist_benchmark_metric", { _metric: m })
    : await admin().from("resilience_metrics").insert(m);
  if (error && m.batch_run_id) throw new Error(`Benchmark metric persistence failed: ${error.message}`);
  if (error) console.error("metric insert failed", error.message);
}

/**
 * Resilient call: primary (guarded by breaker) → secondary → cache → failed.
 * Writes exactly one resilience_metrics row.
 */
/**
 * Benchmark-only options. Never parsed from HTTP bodies: only the cron-auth
 * protected resilience-benchmark runner constructs this object in code.
 */
export interface BenchOptions {
  mode: "resilient" | "baseline";
  forcePrimaryFail?: boolean;
  /** Both providers down when combined with forcePrimaryFail → only cache can answer. */
  forceSecondaryFail?: boolean;
  runId: string; config: string; phase: string;
  batchRunId?: string; repIndex?: number; scenario?: string; callIndex?: number;
  cooldownMs?: number;
  concurrency?: number;
  onTransition?: (t: { at: string; from: string | null; to: string; consecutive_failures?: number }) => void;
}
export const forcedFailAdapter = (model: string): ProviderAdapter => ({
  name: model,
  async call() { throw new TransientError(`${model} injected outage`, 503); },
});

export async function resilientChat(functionName: string, req: ChatRequest, opts: { primary?: string; secondary?: string | null; cacheKey?: unknown; bench?: BenchOptions; timeoutMs?: number; maxRetries?: number; secondaryRequest?: ChatRequest; primaryAdapter?: ProviderAdapter; secondaryTimeoutMs?: number; fallbackOnTimeout?: boolean } = {}): Promise<AIResult> {
  const start = Date.now();
  const bench = opts.bench;
  const callOptions = { timeoutMs: opts.timeoutMs ?? CONFIG.timeoutMs, maxRetries: opts.maxRetries ?? CONFIG.maxRetries, sleepFn: sleep };
  const primaryModel = opts.primary ?? CONFIG.primaryModel;
  const secondaryModel = opts.secondary === undefined ? CONFIG.secondaryModel : opts.secondary;
  // benchmark uses an isolated breaker so real users are never affected
  const service = bench ? `bench:ai:${primaryModel}` : `ai:${primaryModel}`;
  const primaryAdapter = bench?.forcePrimaryFail ? forcedFailAdapter(primaryModel) : opts.primaryAdapter ?? gatewayAdapter(primaryModel);
  const tags = bench ? { benchmark_run_id: bench.runId, config: bench.config, phase: bench.phase,
    ...(bench.batchRunId ? { batch_run_id: bench.batchRunId, rep_index: bench.repIndex, scenario: bench.scenario, call_index: bench.callIndex, concurrency: bench.concurrency } : {}) } : {};
  const cooldown = bench?.cooldownMs ?? CONFIG.cooldownMs;
  const writeB = async (prev: BreakerRow | null, next: Omit<BreakerRow, "service">) => {
    if (bench && (prev?.state ?? "CLOSED") !== next.state) bench.onTransition?.({ at: new Date().toISOString(), from: prev?.state ?? "CLOSED", to: next.state });
    await writeBreaker(service, next);
  };
  const hash = await hashRequest(functionName, opts.cacheKey ?? req);
  const finish = async (r: AIResult): Promise<AIResult> => {
    // a cache hit spends no tokens; don't count the cached response's original usage
    const usage = r.path === "cache" ? null : r.data?.usage?.total_tokens ?? null;
    await logMetric({ function_name: functionName, provider_used: r.provider, path: r.path, latency_ms: Date.now() - start, success: r.path !== "failed", http_status: r.status, tokens: usage, degraded: r.degraded, request_hash: hash, ...tags });
    if (bench?.mode !== "baseline" && (r.path === "primary" || r.path === "secondary")) {
      await admin().from("ai_cache").upsert({ request_hash: hash, function_name: functionName, response: r.data, updated_at: new Date().toISOString() });
    }
    return r;
  };

  // Baseline: one direct primary call, no retry/breaker/secondary/cache.
  if (bench?.mode === "baseline") {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
    try {
      const { json, status } = await primaryAdapter.call(req, ctrl.signal);
      return finish({ data: json, path: "primary", provider: primaryModel, degraded: false, status });
    } catch (e) {
      return finish({ data: null, path: "failed", provider: primaryModel, degraded: false, status: (e as TransientError).status || 503 });
    } finally { clearTimeout(t); }
  }

  let lastStatus = 0;
  // 1) primary, if breaker allows
  const row = await readBreaker(service).catch(() => null);
  const dec = breakerDecision(row, Date.now(), cooldown);
  let tryPrimary = dec.allow;
  if (dec.transitionTo === "HALF_OPEN") {
    tryPrimary = await claimHalfOpen(service, row?.opened_at ?? null);
    if (tryPrimary && bench) bench.onTransition?.({ at: new Date().toISOString(), from: "OPEN", to: "HALF_OPEN" });
  }
  if (tryPrimary) {
    const isTrial = dec.transitionTo === "HALF_OPEN";
    try {
      const { json, status } = await callWithRetry(primaryAdapter, req, callOptions);
      await writeB(isTrial ? { ...(row as BreakerRow), state: "HALF_OPEN" } : row, breakerAfter(row, true));
      return finish({ data: json, path: "primary", provider: primaryModel, degraded: false, status });
    } catch (e) {
      if (e instanceof TerminalError) { await finish({ data: null, path: "failed", provider: primaryModel, degraded: false, status: e.status }); throw e; }
      lastStatus = (e as TransientError).status ?? 0;
      console.warn(`[${functionName}] primary failed:`, (e as Error).message);
      // re-read so concurrent failures accumulate instead of overwriting each other
      const fresh = isTrial ? null : await readBreaker(service).catch(() => row);
      const prev = isTrial ? { ...(row as BreakerRow), state: "HALF_OPEN" as const } : (fresh ?? row);
      if (bench) {
        const { data, error } = await admin().rpc("benchmark_record_failure", { _service: service, _threshold: CONFIG.failureThreshold });
        if (error) throw new Error(`Benchmark counter failed: ${error.message}`);
        if (data.previous_state !== data.state) bench.onTransition?.({ at: new Date().toISOString(), from: data.previous_state, to: data.state, consecutive_failures: data.consecutive_failures });
      } else await writeB(prev, breakerAfter(prev, false));
    }
  }
  // 2) secondary
  if (secondaryModel && !(opts.fallbackOnTimeout === false && lastStatus === 504)) {
    try {
      const { json, status } = await callWithRetry(bench?.forceSecondaryFail ? forcedFailAdapter(secondaryModel) : gatewayAdapter(secondaryModel), opts.secondaryRequest ?? req, { ...callOptions, timeoutMs: opts.secondaryTimeoutMs ?? callOptions.timeoutMs });
      return finish({ data: json, path: "secondary", provider: secondaryModel, degraded: false, status });
    } catch (e) {
      lastStatus = (e as TransientError).status ?? lastStatus;
      console.warn(`[${functionName}] secondary failed:`, (e as Error).message);
    }
  }
  // 3) cache
  const { data: cached } = await admin().from("ai_cache").select("response").eq("request_hash", hash).maybeSingle();
  if (cached?.response) return finish({ data: cached.response, path: "cache", provider: "cache", degraded: true, status: 200 });
  return finish({ data: null, path: "failed", provider: null, degraded: true, status: lastStatus || 503 });
}

/** Per-user rate limit (calls per minute). */
export async function checkRateLimit(userId: string, limit = Number(Deno.env.get("AI_RATE_LIMIT_PER_MIN") ?? 30)): Promise<boolean> {
  const { data, error } = await admin().rpc("consume_ai_rate_limit", { _user_id: userId, _limit: limit });
  if (error) { console.error("rate limit rpc", error.message); return true; }
  return data === true;
}

/** Drop-in replacement for fetch(chat/completions) so legacy code paths use the resilient gateway. */
export async function gatewayFetch(functionName: string, _url: string, init: { body?: string; [k: string]: unknown }, opts: { secondary?: string | null } = {}): Promise<Response> {
  const { model, ...req } = JSON.parse(init.body ?? "{}");
  try {
    const r = await resilientChat(functionName, req, { primary: model, secondary: opts.secondary });
    if (r.path === "failed") return new Response(JSON.stringify({ error: "AI unavailable" }), { status: r.status === 429 ? 429 : 503 });
    return new Response(JSON.stringify({ ...r.data, _resilience: { path: r.path, provider: r.provider, degraded: r.degraded } }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: (e as TerminalError).status ?? 500 });
  }
}
