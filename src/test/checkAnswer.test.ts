import { describe, it, expect } from 'vitest';
import { checkAnswer } from '@/lib/courses';

describe('checkAnswer', () => {
  it('accepts a correct fraction matching the solution result', () => {
    const solution = 'Convertimos: 10/15 + 3/15 = 13/15.';
    expect(checkAnswer('13/15', 'MCM 15 suma', solution)).toBe('correct');
  });
  it('rejects a wrong numeric answer', () => {
    expect(checkAnswer('7/8', 'resultado 13/15', '10/15 + 3/15 = 13/15')).toBe('incorrect');
  });
});
