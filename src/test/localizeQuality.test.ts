import { describe, it, expect } from 'vitest';
import { localizeQuality, qualityStrings } from '@/lib/localizeQuality';

const q = {
  coverage: 75, confidence: 'high' as const, status: 'reviewed' as const, word_count: 4000, length_ok: true, reviewed_at: '2026-11-27T02:51:12.885Z',
  control_topics: ['Tire Technology', 'Braking Systems'], covered_topics: ['Tire Technology'], missing_topics: ['Braking Systems'], superficial_topics: [],
  review_flags: [{ kind: 'exercise' as const, exercise_index: 2, message: 'Review exercise answer' }],
};

describe('localizeQuality', () => {
  it('translates topic names and observations in every list', () => {
    const out = localizeQuality(q, { 'Tire Technology': 'Tecnología de neumáticos', 'Braking Systems': 'Sistemas de frenado', 'Review exercise answer': 'Revisar respuesta' })!;
    expect(out.covered_topics).toEqual(['Tecnología de neumáticos']);
    expect(out.missing_topics).toEqual(['Sistemas de frenado']);
    expect(out.control_topics).toEqual(['Tecnología de neumáticos', 'Sistemas de frenado']);
    expect(out.review_flags[0].message).toBe('Revisar respuesta');
  });
  it('keeps coverage, date and flag targets unchanged', () => {
    const out = localizeQuality(q, { 'Tire Technology': 'Tecnología de neumáticos' })!;
    expect(out.coverage).toBe(75);
    expect(out.reviewed_at).toBe('2026-11-27T02:51:12.885Z');
    expect(out.review_flags[0].exercise_index).toBe(2);
  });
  it('collects each report string once', () => {
    expect(qualityStrings([q, q])).toEqual(['Tire Technology', 'Braking Systems', 'Review exercise answer']);
  });
});
