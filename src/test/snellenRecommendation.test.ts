import { describe, expect, it } from 'vitest';
import { recommendedPreferencesForSnellen } from '@/types';

describe('Snellen recommendation', () => {
  it('worse acuity gives larger text', () => {
    expect(recommendedPreferencesForSnellen('6/60').fontSize).toBeGreaterThan(recommendedPreferencesForSnellen('6/12').fontSize);
  });
  it('moderate acuity turns on high contrast', () => {
    expect(recommendedPreferencesForSnellen('6/36').contrast).toBe('high');
    expect(recommendedPreferencesForSnellen('6/6').contrast).toBe('normal');
  });
});
