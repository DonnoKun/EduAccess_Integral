import { expect, it } from 'vitest';
import { lessonPercentage } from '../lib/lessonProgress';
it('counts two correct exercises out of four as 50%', () => {
  expect(lessonPercentage(0, 2, 4)).toBe(50);
});
it('preserves saved progress after reopening', () => {
  expect(lessonPercentage(75, 0, 4)).toBe(75);
});
it('marks an explicitly completed lesson as 100%', () => {
  expect(lessonPercentage(0, 0, 0, true)).toBe(100);
});