import { admin, CONFIG, resilientChat } from "../_shared/ai-gateway.ts";
import { aggregateBatch, cellComplete, phasePlan, keyOf, type Batch, type PhaseRow, type MetricRow } from "./statistics.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const topics = ["photosynthesis", "fractions", "the water cycle", "gravity", "volcanoes", "the solar system", "verbs", "ecosystems", "electric circuits", "the human heart"];
function checked<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
export async function readRows(id: string) {
  const rows: MetricRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const part = checked(await admin().from("resilience_metrics").select("*").eq("benchmark_run_id", id).order("id").range(offset, offset + 499)) as MetricRow[];
    rows.push(...part);
    if (part.length < 500) return rows;
  }
}
export async function readPhases(id: string) {
  return checked(await admin().from("benchmark_phases").select("*").eq("batch_run_id", id)) as PhaseRow[];
}
const phaseFilter = (p: PhaseRow, id: string) => ({ batch_run_id: id, rep_index: p.rep_index, scenario: p.scenario, config: p.config, phase: p.phase });
async function patchPhase(id: string, p: PhaseRow, patch: Record<string, unknown>) {
  checked(await admin().from("benchmark_phases").update(patch).match(phaseFilter(p, id)));
}
async function pause(batch: Batch, reason: string) {
  checked(await admin().from("benchmark_batches").update({ status: "paused", pause_reason: reason }).eq("id", batch.id));
  batch.status = "paused"; batch.pause_reason = reason;
}

/** One bounded phase per invocation; callers continue with the same immutable batch id. */
export async function batchBenchmark(body: Record<string, unknown>): Promise<Response> {
  const action = body.action ?? "run";
  if (!["run", "summarize", "export"].includes(String(action))) return Response.json({ error: "Invalid action" }, { status: 400 });
  const id = body.batch_run_id ?? (action === "run" ? crypto.randomUUID() : null);
  if (typeof id !== "string" || !uuid.test(id)) return Response.json({ error: "Valid batch_run_id required" }, { status: 400 });
  const db = admin();
  let batch = checked(await db.from("benchmark_batches").select("*").eq("id", id).maybeSingle()) as Batch | null;
  if (action !== "run") {
    if (!batch) return Response.json({ error: "Batch not found" }, { status: 404 });
    const rows = await readRows(id);
    if (action === "summarize") return Response.json(aggregateBatch(batch, await readPhases(id), rows));
    if (body.format === "csv") {
      const fields = ["batch_run_id", "concurrency", "rep_index", "scenario", "config", "phase", "call_index", "path", "success", "degraded", "latency_ms", "tokens", "http_status", "created_at"];
      const csv = [fields.join(","), ...rows.map((row) => fields.map((f) => JSON.stringify((row as unknown as Record<string, unknown>)[f] ?? null)).join(","))].join("\n");
      return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="benchmark-${id}.csv"` } });
    }
    return Response.json({ batch_run_id: id, rows });
  }
  const scenario = String(body.scenario ?? batch?.scenario ?? "both");
  const repetitions = Number(body.repetitions ?? batch?.repetitions ?? 5);
  const n = Number(body.n ?? batch?.requests_per_phase ?? 40);
  const concurrency = Number(body.concurrency ?? batch?.concurrency ?? 4);
  const cooldown = Number(body.cooldownMs ?? batch?.cooldown_ms ?? 10000);
  if (!["both", "primary_failure", "graceful_degradation"].includes(scenario) || !Number.isInteger(repetitions) || repetitions < 1 || repetitions > 30 || !Number.isInteger(n) || n < 1 || n > 100 || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20 || !Number.isInteger(cooldown) || cooldown < 1000 || cooldown > 60000 || (body.live !== undefined && body.live !== true)) return Response.json({ error: "Invalid batch settings; only live evaluation is supported" }, { status: 400 });
  if (batch && (batch.scenario !== scenario || batch.repetitions !== repetitions || batch.requests_per_phase !== n || batch.concurrency !== concurrency || batch.cooldown_ms !== cooldown)) return Response.json({ error: "Existing batch settings are immutable" }, { status: 409 });
  if (batch?.status === "paused" && body.restart_incomplete_cell !== true) return Response.json(aggregateBatch(batch, await readPhases(id), await readRows(id)));
  const owner = crypto.randomUUID();
  if (!checked(await db.rpc("claim_benchmark_lease", { _owner: owner }))) return Response.json({ batch_run_id: id, status: "busy", retry_after_s: 10 }, { status: 409 });
  try {
    if (!batch) {
      batch = checked(await db.from("benchmark_batches").insert({ id, scenario, repetitions, requests_per_phase: n, concurrency, cooldown_ms: cooldown }).select().single()) as Batch;
    }
    const plan = phasePlan(scenario);
    checked(await db.from("benchmark_phases").upsert(Array.from({ length: repetitions }, (_, r) => plan.map((p) => ({ batch_run_id: id, rep_index: r + 1, ...p }))).flat(), { onConflict: "batch_run_id,rep_index,scenario,config,phase", ignoreDuplicates: true }));
    let phases = await readPhases(id);
    let rows = await readRows(id);
    const unfinishedRep = Array.from({ length: repetitions }, (_, i) => i + 1).find(rep => !cellComplete(batch, phases, rows, rep));
    if (unfinishedRep !== undefined && body.restart_incomplete_cell === true) {
      // Explicit owner-authorized restart, once per cell, under the shared lease.
      // Never erase or repeat a complete repetition or another load level.
      checked(await db.from('resilience_metrics').delete().match({ batch_run_id: batch.sweep_id ?? id, concurrency, rep_index: unfinishedRep, scenario }));
      checked(await db.from('benchmark_call_checkpoints').delete().match({ batch_run_id: id, rep_index: unfinishedRep, scenario }));
      checked(await db.from('benchmark_phases').update({ status: 'pending', started_at: null, completed_at: null, breaker_reset_at: null, recovery_time_s: null, breaker_observation: null }).match({ batch_run_id: id, rep_index: unfinishedRep, scenario }));
      phases = await readPhases(id);
      rows = await readRows(id);
    }
    if (batch.status !== 'running') {
      checked(await db.from('benchmark_batches').update({ status: 'running', pause_reason: null }).eq('id', id));
      batch.status = 'running'; batch.pause_reason = null;
    }
    const pending = phases.filter((p) => p.status !== "completed").sort((a, b) => a.rep_index - b.rep_index || plan.findIndex((x) => keyOf(x) === keyOf(a)) - plan.findIndex((x) => keyOf(x) === keyOf(b)))[0];
    if (pending) await runPhase(batch, pending);
    const freshPhases = await readPhases(id);
    const freshRows = await readRows(id);
    if (Array.from({ length: repetitions }, (_, i) => i + 1).every(rep => cellComplete(batch, freshPhases, freshRows, rep))) {
      checked(await db.from("benchmark_batches").update({ status: "completed" }).eq("id", id));
      batch.status = "completed";
    }
    return Response.json({ batch_run_id: id, status: batch.status, pause_reason: batch.pause_reason, phases_completed: freshPhases.filter((p) => p.status === "completed").length, phases_total: freshPhases.length, next_action: batch.status === "running" ? "run" : "summarize" });
  } catch (error) {
    if (batch) await pause(batch, `Execution interrupted: ${(error as Error).message}; inspect stored checkpoints before resuming.`);
    return Response.json({ batch_run_id: id, status: "paused", error: (error as Error).message }, { status: 500 });
  } finally {
    checked(await db.from("benchmark_leases").delete().eq("name", "benchmark").eq("owner", owner));
  }
}

async function runPhase(batch: Batch, phase: PhaseRow) {
  const db = admin(), filter = phaseFilter(phase, batch.id);
  const existing = (await readRows(batch.id)).filter((r) => r.rep_index === phase.rep_index && keyOf(r) === keyOf(phase));
  const checkpoints = checked(await db.from("benchmark_call_checkpoints").select("call_index,status").match(filter)) as { call_index: number; status: string }[];
  // An expired reservation without a result may already have been billed. Never replay it.
  if (checkpoints.some((c) => !existing.some((r) => r.call_index === c.call_index))) {
    await pause(batch, "Unknown outcome: a reserved call has no stored metric. Inspect provider logs; automatic replay is disabled."); return;
  }
  const denied = existing.find((r) => r.http_status === 402 || r.http_status === 403 || r.http_status === 429);
  if (denied) { await pause(batch, `Provider/credit/rate-limit failure (${denied.http_status}); owner recovery required.`); return; }
  const start = phase.started_at ? Date.parse(phase.started_at) : Date.now();
  const service = `bench:ai:${CONFIG.primaryModel}`;
  const first = ["A", "W"].includes(phase.phase);
  if (!phase.started_at) {
    const resetAt = first ? new Date().toISOString() : null;
    if (first) checked(await db.from("circuit_breaker_state").upsert({ service, state: "CLOSED", consecutive_failures: 0, opened_at: null, updated_at: resetAt }));
    await patchPhase(batch.id, phase, { status: "running", started_at: new Date(start).toISOString(), breaker_reset_at: resetAt });
  }
  const recovery = phase.config === "resilient" && ["C", "R"].includes(phase.phase);
  if (recovery && !existing.length) {
    const state = checked(await db.from("circuit_breaker_state").select("state,opened_at").eq("service", service).maybeSingle());
    if (state?.state === "OPEN") {
      const wait = Math.max(0, Date.parse(state.opened_at) + batch.cooldown_ms + 100 - Date.now());
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  const remaining = Array.from({ length: batch.requests_per_phase }, (_, i) => i).filter((i) => !existing.some((r) => r.call_index === i));
  let cursor = 0, stopReason: string | null = null;
  const invocationStart = Date.now();
  const transitionWrites: Promise<unknown>[] = [];
  let observation = phase.breaker_observation ?? {};
  const one = async (index: number) => {
    checked(await db.from("benchmark_call_checkpoints").insert({ ...filter, call_index: index }));
    const coldIndex = phase.phase === "Dmiss" ? batch.requests_per_phase + index : index;
    const content = `[batch ${batch.id}; repetition ${phase.rep_index}; scenario ${phase.scenario}; item ${coldIndex}] Explain ${topics[coldIndex % topics.length]} in one short sentence.`;
    const fault = phase.phase === "B" || ["Dhit", "Dmiss"].includes(phase.phase);
    try {
      const result = await resilientChat("resilience-benchmark", { messages: [{ role: "user", content }], max_tokens: 400 }, {
        bench: { mode: phase.config === "baseline" ? "baseline" : "resilient", runId: batch.id, batchRunId: batch.sweep_id ?? batch.id, concurrency: batch.concurrency, repIndex: phase.rep_index, scenario: phase.scenario, callIndex: index, config: phase.config, phase: phase.phase, cooldownMs: batch.cooldown_ms, forcePrimaryFail: fault, forceSecondaryFail: fault && phase.scenario === "graceful_degradation",
          onTransition: (t) => {
            if (t.to === "OPEN" && observation.opened !== true) { observation = { ...observation, opened: true, failures_before_open: t.consecutive_failures, threshold: CONFIG.failureThreshold }; transitionWrites.push(patchPhase(batch.id, phase, { breaker_observation: observation })); }
            if (phase.phase === "C" && t.to === "CLOSED") { observation = { ...observation, recovered: true }; transitionWrites.push(patchPhase(batch.id, phase, { recovery_time_s: (Date.parse(t.at) - start) / 1000, breaker_observation: observation })); }
          } },
      });
      if ([402, 403, 429].includes(result.status)) stopReason = `Provider/credit/rate-limit failure (${result.status}); owner recovery required.`;
      checked(await db.from("benchmark_call_checkpoints").update({ status: "completed", completed_at: new Date().toISOString() }).match({ ...filter, call_index: index }));
    } catch (e) {
      stopReason = `Call interrupted: ${(e as Error).message}. Inspect stored result before any retry.`;
    }
  };
  // Serialize HALF_OPEN's first trial to keep phase recovery path unambiguous.
  if (recovery && remaining.length && !existing.length) await one(remaining[cursor++]);
  await Promise.all(Array.from({ length: batch.concurrency }, async () => {
    while (cursor < remaining.length && !stopReason && Date.now() - invocationStart < 100000) await one(remaining[cursor++]);
  }));
  await Promise.all(transitionWrites);
  if (stopReason) { await pause(batch, stopReason); return; }
  const stored = (await readRows(batch.id)).filter((r) => r.rep_index === phase.rep_index && keyOf(r) === keyOf(phase));
  if (stored.length === batch.requests_per_phase) {
    const breaker = checked(await db.from("circuit_breaker_state").select("state,consecutive_failures").eq("service", service).single());
    await patchPhase(batch.id, phase, { status: "completed", completed_at: new Date().toISOString(), breaker_observation: { ...observation, ...breaker } });
  }
}