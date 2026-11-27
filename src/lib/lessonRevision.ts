import type { LessonContent, GroupLesson } from '@/lib/courses';

export interface LessonDraft { title: string; description: string; content: LessonContent }

/** Owner preview never changes publication status or the student snapshot. */
export function ownerLessonPreview(lesson: GroupLesson, draft?: LessonDraft | null): GroupLesson {
  return draft ? { ...lesson, ...draft } : lesson;
}

export function lessonLanguage(content: LessonContent): 'es' | 'en' {
  if (content.language === 'es' || content.language === 'en') return content.language;
  const sample = `${content.introduction || ''} ${content.summary || ''}`.toLowerCase();
  const es = (sample.match(/\b(el|la|los|las|de|que|y|en|una|es)\b/g) || []).length;
  const en = (sample.match(/\b(the|and|of|to|is|in|a|that|with)\b/g) || []).length;
  return es >= en ? 'es' : 'en';
}