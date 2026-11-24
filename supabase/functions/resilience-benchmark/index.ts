/**
 * Thesis OE3 benchmark: baseline vs resilient × phases A (normal), B (injected
 * primary outage), C (recovery). Cron-auth protected; the only caller allowed to
 * pass fault-injection / baseline options to resilientChat.
 * Body: { n?, concurrency?, configs?: ["baseline","resilient"], cooldownMs?, action?: "export", run_id? }
 */
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { admin, resilientChat, CONFIG } from "../_shared/ai-gateway.ts";

const PROMPTS = [
  "Define accessibility in one short sentence.",
  "Name one WCAG principle in three words.",
  "Give a one-line tip for readable fonts.",
  "What is alt text? One sentence.",
  "Say one benefit of captions in five words.",
];
type Row = { latency_ms: number; success: boolean; path: string; tokens: number | null };
const pct = (a: number[], p: number) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };

function summarize(rows: Row[], wallMs: number) {
  const ok = rows.filter((r) => r.success), lat = rows.map((r) => r.latency_ms);
  const paths = { primary: 0, secondary: 0, cache: 0, failed: 0 } as Record<string, number>;
  rows.forEach((r) => { paths[r.path] = (paths[r.path] ?? 0) + 1; });
  const tokens = rows.reduce((s, r) => s + (r.tokens ?? 0), 0);
  const okTok = ok.filter((r) => r.tokens).map((r) => r.tokens!) as number[];
  const avgTok = okTok.length ? okTok.reduce((a, b) => a + b, 0) / okTok.length : 0;
  return {
    requests: rows.length,
    availability_pct: rows.length ? +(100 * ok.length / rows.length).toFixed(2) : null,
    error_rate_pct: rows.length ? +(100 * (rows.length - ok.length) / rows.length).toFixed(2) : null,
    throughput_rps: wallMs ? +(ok.length / (wallMs / 1000)).toFixed(3) : null,
    latency_ms: { p50: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99) },
    path_breakdown: paths, tokens_used: tokens,
    cache_hits: paths.cache, est_tokens_saved_by_cache: Math.round(paths.cache * avgTok),
    est_ai_calls_saved_by_cache: paths.cache,
  };
}

Deno.serve(async (req) => {
  const authFailure = authenticateCronRequest(req);
  if (authFailure) return authFailure;
  const body = await req.json().catch(() => ({}));
  const db = admin();

  if (body.action === "export") {
    if (typeof body.run_id !== "string") return Response.json({ error: "run_id required" }, { status: 400 });
    const { data, error } = await db.rpc("get_benchmark_metrics", { _run_id: body.run_id });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ run_id: body.run_id, rows: data });
  }

  const n = Math.min(Math.max(Number(body.n ?? 40), 1), 200);
  const conc = Math.min(Math.max(Number(body.concurrency ?? 4), 1), 10);
  const cooldownMs = Math.min(Math.max(Number(body.cooldownMs ?? 10000), 1000), 60000);
  const configs: ("baseline" | "resilient")[] = (Array.isArray(body.configs) ? body.configs : ["baseline", "resilient"]).filter((c: string) => c === "baseline" || c === "resilient");
  const runId = typeof body.run_id === "string" ? body.run_id : crypto.randomUUID();
  const service = `bench:ai:${CONFIG.primaryModel}`;
  const transitions: { at: string; from: string | null; to: string; phase: string }[] = [];
  const result: Record<string, any> = {};

  for (const config of configs) {
    await db.from("circuit_breaker_state").upsert({ service, state: "CLOSED", consecutive_failures: 0, opened_at: null, updated_at: new Date().toISOString() });
    const all: Row[] = []; let allWall = 0;
    result[config] = { phases: {} };
    for (const phase of ["A", "B", "C"]) {
      const rows: Row[] = []; const t0 = Date.now(); let i = 0;
      const worker = async () => {
        while (i < n) {
          const k = i++;
          const s = Date.now();
          let r;
          try {
            r = await resilientChat("resilience-benchmark", { messages: [{ role: "user", content: PROMPTS[k % PROMPTS.length] }], max_tokens: 400 }, {
              bench: { mode: config, forcePrimaryFail: phase === "B", runId, config, phase, cooldownMs,
                onTransition: (t) => transitions.push({ ...t, phase }) },
            });
          } catch { r = { path: "failed", data: null }; }
          rows.push({ latency_ms: Date.now() - s, success: r.path !== "failed", path: r.path, tokens: r.data?.usage?.total_tokens ?? null });
        }
      };
      await Promise.all(Array.from({ length: conc }, worker));
      let wall = Date.now() - t0;
      const summary: any = summarize(rows, wall);
      if (phase === "C") {
        if (config === "resilient") {
          // keep probing until breaker closes (bounded) so recovery time is observed
          const deadline = Date.now() + cooldownMs + 20000;
          let closedAt = transitions.find((t) => t.phase === "C" && t.to === "CLOSED")?.at;
          while (!closedAt && Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, 1000));
            const { data } = await db.from("circuit_breaker_state").select("state").eq("service", service).maybeSingle();
            if (data?.state === "CLOSED") { closedAt = new Date().toISOString(); break; }
            await resilientChat("resilience-benchmark", { messages: [{ role: "user", content: PROMPTS[0] }], max_tokens: 400 }, {
              bench: { mode: config, runId, config, phase, cooldownMs, onTransition: (t) => transitions.push({ ...t, phase }) } }).catch(() => null);
            closedAt = transitions.find((t) => t.phase === "C" && t.to === "CLOSED")?.at;
          }
          summary.recovery_time_s = closedAt ? +((Date.parse(closedAt) - t0) / 1000).toFixed(2) : null;
        } else summary.recovery_time_s = "n/a";
      }
      result[config].phases[phase] = summary;
      all.push(...rows); allWall += wall;
    }
    result[config].overall = summarize(all, allWall);
  }
  return Response.json({ run_id: runId, n, concurrency: conc, cooldown_ms: cooldownMs, primary_model: CONFIG.primaryModel, secondary_model: CONFIG.secondaryModel, results: result, circuit_breaker_transitions: transitions });
});
