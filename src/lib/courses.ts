/**
 * EduAccess - Courses / Groups layer
 * Teacher-owned groups with join codes, group lessons and student progress.
 * Independent from the self-managed ("modo directo") library flow.
 */

import { supabase } from '@/integrations/supabase/client';

export interface Group {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  level: string;
  join_code: string;
  created_at: string;
  updated_at?: string;
}

export interface GroupLesson {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string;
  content: LessonContent;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface LessonSection {
  title: string;
  content: string;
  keyPoints?: string[];
  image_alt?: string;
}

export interface LessonExample {
  title: string;
  description: string;
}

export interface LessonExercise {
  question: string;
  hint?: string;
  answer_keywords?: string;
  solution?: string;
}

export interface LessonSource {
  name: string;
  url: string;
  description?: string;
}

export interface LessonContent {
  introduction?: string;
  sections?: LessonSection[];
  examples?: LessonExample[];
  exercises?: LessonExercise[];
  summary?: string;
  sources?: LessonSource[];
}

export interface LessonProgress {
  id?: string;
  lesson_id: string;
  group_id: string;
  student_id: string;
  completed: boolean;
  progress_percentage: number;
  exercises_completed: number;
  exercises_total: number;
  time_spent_seconds: number;
}

export interface RosterEntry {
  student_id: string;
  student_name: string;
  enrolled_at: string;
}

/** Unambiguous alphabet (no O/0, I/1) for spoken/typed codes. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomJoinCode(length = 7): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Creates a group, retrying if the generated code already exists. */
export async function createGroup(input: {
  ownerId: string;
  name: string;
  description: string;
  level: string;
}): Promise<{ group?: Group; error?: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const join_code = randomJoinCode();
    const { data, error } = await supabase
      .from('groups')
      .insert({
        owner_id: input.ownerId,
        name: input.name,
        description: input.description,
        level: input.level,
        join_code,
      })
      .select()
      .single();

    if (!error && data) return { group: data as Group };
    if (error && !error.message?.toLowerCase().includes('duplicate')) {
      return { error: error.message };
    }
  }
  return { error: 'Could not generate a unique code' };
}

export async function regenerateJoinCode(groupId: string): Promise<{ code?: string; error?: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const join_code = randomJoinCode();
    const { error } = await supabase.from('groups').update({ join_code }).eq('id', groupId);
    if (!error) return { code: join_code };
    if (!error.message?.toLowerCase().includes('duplicate')) return { error: error.message };
  }
  return { error: 'Could not generate a unique code' };
}

export async function fetchTeacherGroups(ownerId: string): Promise<Group[]> {
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  return (data as Group[]) || [];
}

export async function fetchStudentGroups(studentId: string): Promise<Group[]> {
  const { data } = await supabase
    .from('group_enrollments')
    .select('group_id, created_at, groups(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  return ((data as any[]) || []).map((row) => row.groups).filter(Boolean) as Group[];
}

/** Joins a group by code. Returns a translated-agnostic error key on failure. */
export async function joinGroupByCode(
  code: string,
  studentId: string
): Promise<{ group?: Group; errorKey?: 'not_found' | 'already' | 'own_group' | 'unknown' }> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { errorKey: 'not_found' };

  const { data, error } = await supabase.rpc('find_group_by_code', { _code: clean });
  if (error) return { errorKey: 'unknown' };

  const found = (data as any[])?.[0];
  if (!found) return { errorKey: 'not_found' };
  if (found.owner_id === studentId) return { errorKey: 'own_group' };

  const { error: insertError } = await supabase.from('group_enrollments').insert({
    group_id: found.id,
    student_id: studentId,
    teacher_id: found.owner_id,
  });

  if (insertError) {
    if (insertError.message?.toLowerCase().includes('duplicate')) return { errorKey: 'already' };
    return { errorKey: 'unknown' };
  }

  return { group: { ...found, join_code: clean, created_at: new Date().toISOString() } as Group };
}

export async function fetchGroupLessons(groupId: string, onlyPublished: boolean): Promise<GroupLesson[]> {
  let query = supabase.from('group_lessons').select('*').eq('group_id', groupId);
  if (onlyPublished) query = query.eq('status', 'published');
  const { data } = await query.order('created_at', { ascending: true });
  return ((data as any[]) || []) as GroupLesson[];
}

export async function fetchGroupRoster(groupId: string): Promise<RosterEntry[]> {
  const { data } = await supabase.rpc('get_group_roster', { _group_id: groupId });
  return ((data as any[]) || []) as RosterEntry[];
}

export async function removeStudent(groupId: string, studentId: string) {
  return supabase.from('group_enrollments').delete().eq('group_id', groupId).eq('student_id', studentId);
}

/** Keyword-recall validation shared with the direct-mode exercises (recall >= 0.75). */
export function checkAnswer(userAnswer: string, keywords?: string): 'correct' | 'partial' | 'incorrect' {
  if (!keywords) return 'partial';
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ');

  const stop = new Set(['de', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'a', 'un', 'una', 'the', 'of', 'and', 'to', 'in']);
  const expected = normalize(keywords).split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));
  if (expected.length === 0) return 'partial';

  const given = normalize(userAnswer);
  const matched = expected.filter((w) => given.includes(w)).length;
  const recall = matched / expected.length;

  if (recall >= 0.75) return 'correct';
  if (recall >= 0.35) return 'partial';
  return 'incorrect';
}
