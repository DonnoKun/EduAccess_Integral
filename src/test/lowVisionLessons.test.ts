import { describe, expect, it } from 'vitest';
import { visionContent, shortAlt, lessonRules, isDuplicateEmail } from '../../supabase/functions/_shared/low-vision';
import { copiedLesson, searchLessonIdentity, sectionNarration } from '@/lib/lessonReading';
import { libraryContent, splitLibrary } from '@/lib/libraryRecords';
import { safeSourceUrl } from '@/lib/courses';
import type { SearchResult } from '@/types';

const source: SearchResult = { id: 'lesson-1', title: 'Fracciones', description: 'Sumas', url: 'https://example.org/fractions', contentType: 'exercise', educationLevel: 'middle', source: 'oer', accessibilityStatus: 'accessible', metadata: { tags: [], language: 'es' } };

describe('requested low-vision lesson rules', () => {
  it('sends the actual image as multimodal content, not just URL metadata', () => {
    const image = 'https://example.org/chart.png';
    expect(visionContent({ title: 'Misleading title' }, image)[1]).toEqual({ type: 'image_url', image_url: { url: image } });
    expect(visionContent({ title: 'No image' })).toHaveLength(1);
  });
  it('limits short alt text to 125 characters while leaving long descriptions independent', () => {
    expect(Array.from(shortAlt('a'.repeat(200)))).toHaveLength(125);
    expect(shortAlt('Gráfica de barras')).toBe('Gráfica de barras');
  });
  it('reads key points in their displayed order after section text and image description', () => {
    expect(sectionNarration({ title: 'Sección', content: 'Texto', image_alt: 'Imagen', keyPoints: ['Primero', 'Segundo'] })).toBe('Sección. Texto. Imagen. Primero. Segundo');
  });
  it('isolates format and learning level in the cache identity', () => {
    const key = searchLessonIdentity(source);
    expect(searchLessonIdentity({ ...source, contentType: 'diagram' })).not.toBe(key);
    expect(searchLessonIdentity({ ...source, educationLevel: 'college' })).not.toBe(key);
  });
  it('builds exactly one lesson instruction for the selected level and format', () => {
    const rules = lessonRules('exercise', 'elementary');
    expect(rules).toContain('Elementary school');
    expect(rules).toContain('10-12 progressive exercises');
    expect(rules).toContain('exactly ONE lesson');
    expect(lessonRules('diagram', 'college')).toContain('Visual diagram lesson');
  });
  it('keeps automatically opened lessons recent without making them pinned', () => {
    const recent = libraryContent(source, undefined, true);
    expect(recent.pinned).toBe(false);
    expect(splitLibrary([{ content_data: recent, status: 'saved' }]).recentContent.map(c => c.id)).toEqual(['lesson-1']);
    expect(splitLibrary([{ content_data: recent, status: 'saved' }]).savedContent).toEqual([]);
  });
  it('preserves an explicit pin on subsequent openings', () => {
    const pinned = libraryContent(source);
    expect(libraryContent(source, pinned, true).pinned).toBe(true);
  });
  it('copies a lesson independently without publication or original identifiers', () => {
    const original = { title: 'Original', description: '', content: { sections: [{ title: 'A', content: 'Original text' }] } };
    const copy = copiedLesson(original, 'other-group', 'teacher');
    copy.content.sections[0].content = 'Edited copy';
    expect(original.content.sections[0].content).toBe('Original text');
    expect(copy.group_id).toBe('other-group');
    expect(copy.status).toBe('draft');
    expect(copy).not.toHaveProperty('id');
  });
  it('recognizes duplicate email rejection independently of the requested role', () => {
    expect(isDuplicateEmail({ code: 'email_exists' })).toBe(true);
    expect(isDuplicateEmail({ code: 'user_already_exists' })).toBe(true);
    expect(isDuplicateEmail({ message: 'A user with this email address has already been registered' })).toBe(true);
    expect(isDuplicateEmail({ message: 'Invalid email' })).toBe(false);
  });
  it('preserves actual deep resource links and rejects executable URLs', () => {
    expect(safeSourceUrl('https://example.org/book/chapter-2')).toBe('https://example.org/book/chapter-2');
    expect(safeSourceUrl('javascript:alert(1)')).toBeNull();
  });
});