import type { LessonContent } from '@/lib/courses';

type Quality = NonNullable<LessonContent['quality']>;

/** Every human-readable report string: topic names and observation messages. */
export function qualityStrings(qualities: (Quality | undefined)[]): string[] {
  return Array.from(new Set(qualities.flatMap(q => q ? [
    ...q.control_topics, ...q.covered_topics, ...q.missing_topics, ...q.superficial_topics,
    ...q.review_flags.map(f => f.message),
  ] : [])));
}

/** Display copy of a report in the interface language; measured values, dates and targets stay untouched. */
export function localizeQuality(q: Quality | undefined, map: Record<string, string>): Quality | undefined {
  if (!q) return q;
  const tr = (s: string) => map[s] || s;
  return {
    ...q,
    control_topics: q.control_topics.map(tr), covered_topics: q.covered_topics.map(tr),
    missing_topics: q.missing_topics.map(tr), superficial_topics: q.superficial_topics.map(tr),
    review_flags: q.review_flags.map(f => ({ ...f, message: tr(f.message) })),
  };
}
