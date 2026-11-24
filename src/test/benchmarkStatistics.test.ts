import { describe, expect, it } from "vitest";
import { distribution, aggregateBatch, phasePlan, type Batch, type MetricRow, type PhaseRow } from "../../supabase/functions/resilience-benchmark/statistics";

describe("five independent benchmark repetitions", () => {
  it("uses sample SD and Student-t df=4 for a 95% interval", () => {
    const d = distribution([1, 2, 3, 4, 5]);
    expect(d.n).toBe(5); expect(d.mean).toBe(3);
    expect(d.sd).toBeCloseTo(Math.sqrt(2.5), 10);
    expect(d.ci95?.lower).toBeCloseTo(1.03675684, 7);
    expect(d.ci95?.upper).toBeCloseTo(4.96324316, 7);
  });
  it("does not invent a confidence interval from one or no samples", () => {
    expect(distribution([null]).n).toBe(0);
    expect(distribution([7]).ci95).toBeNull();
  });
  it("requires both scenarios with 12 phases per repetition", () => {
    expect(phasePlan("both")).toHaveLength(12);
    expect(phasePlan("primary_failure")).toHaveLength(6);
    expect(phasePlan("graceful_degradation")).toHaveLength(6);
  });
  it("excludes incomplete repetitions and flags changed availability and paths", () => {
    const batch: Batch = { id: "test", scenario: "primary_failure", repetitions: 5, requests_per_phase: 1, concurrency: 1, cooldown_ms: 10000, status: "running", pause_reason: null };
    const phases: PhaseRow[] = [], rows: MetricRow[] = [];
    for (let rep = 1; rep <= 5; rep++) for (const p of phasePlan("primary_failure")) {
      phases.push({ ...p, rep_index: rep, status: rep === 5 ? "running" : "completed", started_at: "2026-11-24T00:00:00Z", completed_at: "2026-11-24T00:00:01Z", recovery_time_s: 10, breaker_reset_at: null });
      rows.push({ ...p, rep_index: rep, latency_ms: 100, success: rep !== 3, path: rep === 3 ? "failed" : "primary", degraded: false, tokens: 10, http_status: 200, call_index: 0, created_at: "2026-11-24T00:00:01Z" });
    }
    const result = aggregateBatch(batch, phases, rows);
    const scenario = result.scenarios.primary_failure as { repetitions_stored: number; phases: Record<string, { invariants: { deviating_repetitions: number[] }; metrics: { availability_pct: { n: number } } }> };
    expect(result.complete).toBe(false);
    expect(scenario.repetitions_stored).toBe(4);
    expect(scenario.phases["resilient/A"].metrics.availability_pct.n).toBe(4);
    expect(scenario.phases["resilient/A"].invariants.deviating_repetitions).toEqual([3]);
  });
});