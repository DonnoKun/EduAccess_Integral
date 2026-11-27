import { describe, expect, it } from 'vitest';
import { lessonLanguage, ownerLessonPreview } from '@/lib/lessonRevision';
import type { GroupLesson } from '@/lib/courses';

const published: GroupLesson = { id: 'lesson', group_id: 'group', created_by: 'teacher', title: 'Published', description: '', content: { introduction: 'Original', language: 'en' }, status: 'published', published_at: '2026-11-26T10:00:00Z', created_at: '2026-11-26T09:00:00Z' };
describe('versiones de lección', () => {
  it('abrir el borrador del propietario no publica ni modifica la versión del estudiante', () => {
    const preview = ownerLessonPreview(published, { title: 'Editado', description: '', content: { introduction: 'Borrador', language: 'es' } });
    expect(preview.content.introduction).toBe('Borrador');
    expect(preview.status).toBe('published');
    expect(preview.published_at).toBe(published.published_at);
    expect(published.content.introduction).toBe('Original');
    expect(ownerLessonPreview({ ...published, status: 'draft' }, { title: 'Otro', description: '', content: {} }).status).toBe('draft');
  });
  it('respeta el idioma guardado en ambas direcciones', () => {
    expect(lessonLanguage({ language: 'es', introduction: 'The original' })).toBe('es');
    expect(lessonLanguage({ language: 'en', introduction: 'La original' })).toBe('en');
  });
});