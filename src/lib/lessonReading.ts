import type { LessonContent, LessonSection } from './courses';

export function sectionNarration(section: LessonSection) {
  return [section.title, section.content, section.image_alt, ...(section.keyPoints || [])].filter(Boolean).join('. ');
}
export function lessonNarration(content: LessonContent) {
  return [content.introduction, ...(content.sections || []).map(sectionNarration), content.summary].filter(Boolean).join('. ');
}

export function searchLessonIdentity(content: { title: string; description: string; url: string; contentType: string; educationLevel: string }) {
  return `search-lesson-v4:${JSON.stringify([content.title.trim(), content.description.trim(), content.url, content.contentType, content.educationLevel])}`;
}

export function copiedLesson<T extends { title: string; description: string; content: LessonContent }>(source: T, groupId: string, userId: string) {
  return { group_id: groupId, created_by: userId, title: source.title, description: source.description, content: JSON.parse(JSON.stringify(source.content)), status: 'draft' as const };
}