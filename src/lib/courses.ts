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
  revision?: number;
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
  image_prompt?: string;
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
  language?: string;
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

  const { data, error } = await supabase.rpc('join_group_by_code' as any, { _code: clean });
  if (error) return { errorKey: 'unknown' };
  const res = data as any;
  if (!res?.success) {
    const k = res?.error;
    return { errorKey: k === 'not_found' || k === 'already' || k === 'own_group' ? k : 'unknown' };
  }
  const found = { id: res.id, name: res.name, description: res.description, level: res.level, owner_id: res.owner_id };
  void studentId;
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

/** Teacher-side manual enrollment by the student's registered email. */
export async function enrollStudentByEmail(
  groupId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('enroll_student_by_email' as any, {
    _group_id: groupId,
    _email: email,
  });
  if (error) return { success: false, error: 'unknown' };
  const res = (data as any) || {};
  return { success: !!res.success, error: res.error };
}

export interface GroupInvitation { id: string; group_id: string; group_name: string; group_level: string; created_at: string }

export async function fetchMyInvitations(): Promise<GroupInvitation[]> {
  const { data } = await supabase.rpc('list_my_invitations' as any);
  return ((data as any[]) || []) as GroupInvitation[];
}

export async function acceptInvitation(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('accept_group_invitation' as any, { _invitation_id: id });
  return !error && !!(data as any)?.success;
}

export async function declineInvitation(id: string) {
  return supabase.from('group_invitations' as any).delete().eq('id', id);
}

export async function removeStudent(groupId: string, studentId: string) {
  return supabase.from('group_enrollments').delete().eq('group_id', groupId).eq('student_id', studentId);
}

export async function updateGroup(groupId: string, input: { name: string; description: string; level: string }) {
  return supabase.from('groups').update(input).eq('id', groupId);
}

/** Deleting a group cascades to its lessons, enrollments and progress. */
export async function deleteGroup(groupId: string) {
  return supabase.from('groups').delete().eq('id', groupId);
}

/** AI-generated deep links often 404; link to the source's site root instead. */
export function safeSourceUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.origin;
  } catch {
    return null;
  }
}

const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Numeric / math tokens like "13/15", "0.5", "-3", "42". */
function mathTokens(s: string): string[] {
  return (normalizeText(s).replace(/\s*\/\s*/g, '/').replace(/,/g, '.').match(/-?\d+(?:[./]\d+)?/g) || []);
}

/**
 * Keyword-recall validation shared with the direct-mode exercises (recall >= 0.75).
 * Numeric answers are correct when they match the final result of the keywords or solution.
 */
export function checkAnswer(
  userAnswer: string,
  keywords?: string,
  solution?: string
): 'correct' | 'partial' | 'incorrect' {
  if (!userAnswer.trim()) return 'incorrect';

  const givenMath = mathTokens(userAnswer);
  if (givenMath.length > 0) {
    const refs = [keywords, solution].filter(Boolean) as string[];
    for (const ref of refs) {
      const tokens = mathTokens(ref);
      if (tokens.length === 0) continue;
      const finalAnswer = tokens[tokens.length - 1];
      if (givenMath.includes(finalAnswer)) return 'correct';
      if (ref === keywords && givenMath.some((g) => tokens.includes(g))) return 'partial';
    }
  }

  if (!keywords) return 'partial';
  const normalize = (s: string) => normalizeText(s).replace(/[^\w\s]/g, ' ');

  const stop = new Set(['de', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'a', 'un', 'una', 'the', 'of', 'and', 'to', 'in']);
  const expected = normalize(keywords).split(/\s+/).filter((w) => (w.length > 2 || /\d/.test(w)) && !stop.has(w));
  if (expected.length === 0) return 'partial';

  const given = normalize(userAnswer);
  const matched = expected.filter((w) => given.includes(w)).length;
  const recall = matched / expected.length;

  if (recall >= 0.75) return 'correct';
  if (recall >= 0.35) return 'partial';
  return 'incorrect';
}
