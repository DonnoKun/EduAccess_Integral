import { aggregateBatch, type Batch, type PhaseRow, type MetricRow } from './statistics.ts';
export type Sweep = { id: string; scenario: string; concurrency_levels: number[]; reps_per_level: number; children: Record<string, string> };
export function validLevels(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 4 && value.every(x => Number.isInteger(x) && x >= 1 && x <= 20) && new Set(value).size === value.length;
}
export function aggregateSweep(sweep: Sweep, cells: { batch: Batch; phases: PhaseRow[]; rows: MetricRow[] }[]) {
  const trends: Record<string, Record<string, number | null>> = {};
  let stored = 0;
  const levels = cells.map(({ batch, phases, rows }) => {
    const result = aggregateBatch(batch, phases, rows);
    const scenario = result.scenarios[sweep.scenario] as { repetitions_stored: number; complete_repetitions: number[]; phases: Record<string, { metrics: Record<string, { mean: number | null }>; invariants: { all_identical: boolean } }> };
    stored += scenario.repetitions_stored;
    for (const [group, phase] of Object.entries(scenario.phases)) for (const [metric, d] of Object.entries(phase.metrics)) (trends[`${group}/${metric}`] ??= {})[batch.concurrency] = d.mean;
    const breaker = scenario.complete_repetitions.map(rep => {
      const b = phases.find(p => p.rep_index === rep && p.config === 'resilient' && p.phase === 'B')?.breaker_observation;
      const c = phases.find(p => p.rep_index === rep && p.config === 'resilient' && p.phase === 'C')?.breaker_observation;
      return { rep_index: rep, opened: b?.opened === true, recovered: c?.state === 'CLOSED' && c?.recovered === true, failures_before_open: b?.failures_before_open ?? null, failures_at_phase_end: b?.consecutive_failures ?? null, threshold: b?.threshold ?? null };
    });
    return { concurrency: batch.concurrency, ...scenario, breaker_under_load: { per_repetition: breaker, all_opened: breaker.length === sweep.reps_per_level && breaker.every(b => b.opened), all_recovered: breaker.length === sweep.reps_per_level && breaker.every(b => b.recovered), counter_check_passed: breaker.length === sweep.reps_per_level && breaker.every(b => b.failures_before_open === b.threshold), flagged_repetitions: breaker.filter(b => !b.opened || !b.recovered || b.failures_before_open !== b.threshold).map(b => b.rep_index) }, invariant_deviation: Object.values(scenario.phases).some(p => !p.invariants.all_identical), child_batch_run_id: batch.id, status: batch.status, pause_reason: batch.pause_reason };
  });
  const requested = sweep.concurrency_levels.length * sweep.reps_per_level;
  return { batch_run_id: sweep.id, scenario: sweep.scenario, live: true, concurrency_levels: sweep.concurrency_levels, reps_per_level: sweep.reps_per_level, cells_stored: stored, cells_requested: requested, complete: stored === requested, stored_call_rows: cells.reduce((s,c) => s+c.rows.length,0), requests_per_phase: 40, levels, trends, methodology: { confidence: 'Two-sided 95% Student-t intervals across independent repetitions (df=2 for three repetitions).', throughput: 'All 40 requests divided by phase wall time, including database persistence and recovery cooldown; not successful-only throughput.', breaker: 'Atomic row-locked failure counter; count at CLOSED→OPEN transition plus end-of-phase snapshot. Recovery is serialized first HALF_OPEN probe.', independence: 'Separate child UUID per concurrency level and fresh repetition prompt namespace; isolated breaker reset before each configuration.', partial: 'Incomplete repetitions excluded from statistics; export retains all measured rows.' } };
}
