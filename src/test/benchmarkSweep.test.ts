import { describe, it, expect } from 'vitest';
import { validLevels, aggregateSweep } from '../../supabase/functions/resilience-benchmark/sweep-statistics';
import { distribution } from '../../supabase/functions/resilience-benchmark/statistics';
describe('requested concurrency sweep', () => {
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
