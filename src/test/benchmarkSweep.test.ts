import { describe, it, expect } from 'vitest';
import { validLevels, aggregateSweep } from '../../supabase/functions/resilience-benchmark/sweep-statistics';
import { distribution, cellComplete, phasePlan, type Batch, type PhaseRow, type MetricRow } from '../../supabase/functions/resilience-benchmark/statistics';
describe('requested concurrency sweep', () => {
  const batch: Batch = {id:'child',scenario:'primary_failure',repetitions:3,requests_per_phase:40,concurrency:1,cooldown_ms:10000,status:'completed',pause_reason:null};
  const phases = [1,2,3].flatMap(rep_index => phasePlan('primary_failure').map(p => ({...p,rep_index,status:'completed',started_at:null,completed_at:null,recovery_time_s:null,breaker_reset_at:null}))) as PhaseRow[];
  const rows = phases.flatMap(p => Array.from({length:40},(_,call_index) => ({...p,call_index,latency_ms:1,success:true,path:'primary',degraded:false,tokens:1,http_status:200,created_at:''}))) as MetricRow[];
  it('skips all three complete concurrency-1 cells with six stored phases each', () => {
    expect([1,2,3].filter(rep => !cellComplete(batch,phases,rows,rep))).toEqual([]);
  });
  it('does not count a cell with a missing phase as complete', () => {
    expect(cellComplete(batch,phases.slice(1),rows,1)).toBe(false);
  });
  it('does not count a cell with a missing or duplicate call as complete', () => {
    expect(cellComplete(batch,phases,[...rows.slice(1),rows[1]],1)).toBe(false);
  });
  it('accepts [1,5,10,20] without silently capping 20', () => {
    expect(validLevels([1,5,10,20])).toBe(true);
    expect(validLevels([1,5,10,21])).toBe(false);
    expect(validLevels([1,1])).toBe(false);
  });
  it('requests twelve independent cells for four levels and three repetitions', () => {
    const result=aggregateSweep({id:'sweep',scenario:'primary_failure',concurrency_levels:[1,5,10,20],reps_per_level:3,children:{}},[]);
    expect(result.cells_requested).toBe(12);
    expect(result.cells_stored).toBe(0);
    expect(result.complete).toBe(false);
  });
  it('uses Student-t df=2 for three repetitions', () => {
    const d=distribution([1,2,3]);
    expect(d.ci95?.degrees_of_freedom).toBe(2);
    expect(d.ci95?.upper).toBeCloseTo(2+4.30265272975/Math.sqrt(3),10);
  });
});
