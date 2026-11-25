/** Sample SD and two-sided Student-t 95% intervals across independent repetitions. */
const T95 = [0, 12.7062047364, 4.30265272975, 3.18244630528, 2.7764451052, 2.57058183564, 2.44691184879, 2.36462425159, 2.3060041352, 2.26215716285, 2.22813885196, 2.20098516008, 2.17881282966, 2.16036865646, 2.14478668792, 2.13144954556, 2.11990529922, 2.10981557783, 2.10092204024, 2.09302405441, 2.08596344727, 2.07961384473, 2.0738730679, 2.06865761042, 2.06389856163, 2.05953855275, 2.05552943864, 2.05183051648, 2.0484071418, 2.04522964213];
export function distribution(values: (number | null)[]) {
  const v = values.filter((x): x is number => x !== null && Number.isFinite(x));
  const n = v.length;
  if (!n) return { n: 0, mean: null, sd: null, min: null, max: null, ci95: null };
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : null;
  const t = T95[n - 1];
  const margin = sd !== null && t !== undefined ? t * sd / Math.sqrt(n) : null;
  return { n, mean, sd, min: Math.min(...v), max: Math.max(...v), ci95: margin === null ? null : { lower: mean - margin, upper: mean + margin, method: "Student-t", degrees_of_freedom: n - 1 } };
}
export type MetricRow = { rep_index: number; scenario: string; config: string; phase: string; latency_ms: number; success: boolean; path: string; degraded: boolean; tokens: number | null; http_status: number | null; call_index: number; created_at: string };
export type PhaseRow = { rep_index: number; scenario: string; config: string; phase: string; status: string; started_at: string | null; completed_at: string | null; recovery_time_s: number | null; breaker_reset_at: string | null; breaker_observation?: { state?: string; opened?: boolean; recovered?: boolean; failures_before_open?: number; consecutive_failures?: number; threshold?: number } };
export type Batch = { id: string; scenario: string; repetitions: number; requests_per_phase: number; concurrency: number; cooldown_ms: number; status: string; pause_reason: string | null; sweep_id?: string | null };
export const keyOf = (p: { scenario: string; config: string; phase: string }) => `${p.scenario}/${p.config}/${p.phase}`;
export function phasePlan(scenario: string) {
  const plan: { scenario: string; config: string; phase: string }[] = [];
  if (scenario !== "graceful_degradation") for (const config of ["baseline", "resilient"]) for (const phase of ["A", "B", "C"]) plan.push({ scenario: "primary_failure", config, phase });
  if (scenario !== "primary_failure") for (const config of ["resilient", "baseline"]) for (const phase of config === "resilient" ? ["W", "Dhit", "Dmiss", "R"] : ["W", "Dhit"]) plan.push({ scenario: "graceful_degradation", config, phase });
  return plan;
}
/** A cell is complete only with every planned phase and every distinct stored call. */
export function cellComplete(batch: Batch, phases: PhaseRow[], rows: MetricRow[], rep: number, scenario = batch.scenario) {
  return phasePlan(scenario).every(p => phases.some(x => x.rep_index === rep && keyOf(x) === keyOf(p) && x.status === 'completed') && new Set(rows.filter(r => r.rep_index === rep && keyOf(r) === keyOf(p)).map(r => r.call_index)).size === batch.requests_per_phase);
}
const percentile = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * p) - 1];
};
export function aggregateBatch(batch: Batch, phases: PhaseRow[], rows: MetricRow[]) {
  const plan = phasePlan(batch.scenario);
  const scenarios = [...new Set(plan.map((p) => p.scenario))];
  const perScenario: Record<string, unknown> = {};
  let totalComplete = 0;
  for (const scenario of scenarios) {
    const scenarioPlan = plan.filter((p) => p.scenario === scenario);
    const complete: number[] = [];
    for (let rep = 1; rep <= batch.repetitions; rep++) {
      if (cellComplete(batch, phases, rows, rep, scenario)) complete.push(rep);
    }
    totalComplete += complete.length;
    const groups: Record<string, unknown> = {};
    for (const p of scenarioPlan) {
      const perRepetition = complete.map((rep) => {
        const rs = rows.filter((r) => r.rep_index === rep && keyOf(r) === keyOf(p));
        const phase = phases.find((x) => x.rep_index === rep && keyOf(x) === keyOf(p));
        const paths = { primary: 0, secondary: 0, cache: 0, failed: 0 } as Record<string, number>;
        rs.forEach((r) => { paths[r.path] = (paths[r.path] ?? 0) + 1; });
        const good = rs.filter((r) => r.success).length;
        const wall = phase?.started_at && phase.completed_at ? (Date.parse(phase.completed_at) - Date.parse(phase.started_at)) / 1000 : 0;
        const warm = rows.filter((r) => r.rep_index === rep && r.scenario === scenario && r.config === "resilient" && r.phase === "W");
        // Exact paired warm-response usage, not an average applied to cache hits.
        const saved = rs.filter((r) => r.path === "cache").reduce((s, r) => s + (warm.find((w) => w.call_index === r.call_index)?.tokens ?? 0), 0);
        const metrics: Record<string, number | null> = {
          availability_pct: 100 * good / rs.length, error_rate_pct: 100 * (rs.length - good) / rs.length,
          latency_p50_ms: percentile(rs.map((r) => r.latency_ms), .5), latency_p95_ms: percentile(rs.map((r) => r.latency_ms), .95), latency_p99_ms: percentile(rs.map((r) => r.latency_ms), .99),
        };
        if (scenario === "primary_failure") {
          metrics.throughput_rps = wall > 0 ? rs.length / wall : null;
          if (p.config === "resilient" && p.phase === "C") metrics.recovery_time_s = phase?.recovery_time_s ?? null;
        } else {
          metrics.cache_hit_rate_pct = 100 * paths.cache / rs.length;
          metrics.degraded_rate_pct = 100 * rs.filter((r) => r.success && r.degraded).length / rs.length;
          if (p.phase === "Dhit") metrics.tokens_saved_by_cache = saved;
        }
        return { rep_index: rep, requests: rs.length, metrics, path_breakdown: paths, tokens_used: rs.reduce((s, r) => s + (r.tokens ?? 0), 0), breaker_reset_at: phase?.breaker_reset_at ?? null };
      });
      const metricNames = Object.keys(perRepetition[0]?.metrics ?? {});
      const aggregates = Object.fromEntries(metricNames.map((name) => [name, distribution(perRepetition.map((r) => r.metrics[name]))]));
      const signatures = perRepetition.map((r) => JSON.stringify([r.metrics.availability_pct, r.metrics.error_rate_pct, r.path_breakdown]));
      const identical = signatures.length > 0 && new Set(signatures).size === 1;
      const invariantMetric = (field: string) => perRepetition.length > 0 && new Set(perRepetition.map((r) => r.metrics[field])).size === 1;
      const expectedPath = scenario === "primary_failure" ? (p.phase === "B" ? (p.config === "baseline" ? "failed" : "secondary") : "primary") : (["W", "R"].includes(p.phase) ? "primary" : (p.phase === "Dhit" && p.config === "resilient" ? "cache" : "failed"));
      groups[`${p.config}/${p.phase}`] = { metrics: aggregates, per_repetition: perRepetition,
        invariants: { availability_identical: invariantMetric("availability_pct"), error_rate_identical: invariantMetric("error_rate_pct"), path_breakdown_identical: perRepetition.length > 0 && new Set(perRepetition.map((r) => JSON.stringify(r.path_breakdown))).size === 1, all_identical: identical,
          deviating_repetitions: perRepetition.filter((_, i) => signatures[i] !== signatures[0]).map((r) => r.rep_index), expected_path: expectedPath,
          unexpected_repetitions: perRepetition.filter((r) => r.path_breakdown[expectedPath] !== batch.requests_per_phase).map((r) => r.rep_index) } };
    }
    perScenario[scenario] = { repetitions_stored: complete.length, repetitions_requested: batch.repetitions, complete_repetitions: complete, phases: groups };
  }
  return { batch_run_id: batch.id, status: batch.status, pause_reason: batch.pause_reason, complete: totalComplete === scenarios.length * batch.repetitions,
    repetitions_requested: batch.repetitions, stored_call_rows: rows.length, requests_per_phase: batch.requests_per_phase, concurrency: batch.concurrency, cooldown_ms: batch.cooldown_ms,
    methodology: { confidence: "Two-sided 95% Student-t interval of repetition-level means; sample SD (n−1). No clipping of confidence bounds.", latency: "Nearest-rank percentiles of all measured calls, including failures.", throughput: "Total measured requests divided by stored phase wall time, including recovery cooldown.", recovery: "From phase C start (fault removed) to the first observed CLOSED transition, including the configured cooldown.", cache_savings: "Sum of paired warm-response tokens for each Dhit cache hit; cache calls themselves use zero tokens.", degraded_rate: "Successful degraded responses divided by all phase requests.", independence: "Fresh full batch UUID + repetition namespace; reset isolated breaker before each configuration.", partial_repetitions: "Excluded from aggregate; all their measured rows remain exportable." }, scenarios: perScenario };
}