/**
 * EduAccess - Group detail
 * Teacher: manage lessons (AI generated or manual), publish, and follow student progress.
 * Student: browse published lessons of the group.
 */

import GenerationSteps from '@/components/GenerationSteps';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, Copy, Loader2, Plus, Send, Trash2, Users, EyeOff, Pencil } from 'lucide-react';
import { useCourseCache } from '@/hooks/useCourseCache';
import { useTranslatedTexts } from '@/hooks/useTranslatedTexts';
import LessonEditor, { type LessonDraft } from '@/components/LessonEditor';
import { copiedLesson } from '@/lib/lessonReading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import {
  fetchGroupLessons,
  fetchGroupRoster,
  enrollStudentByEmail,
  removeStudent,
  fetchGroupInvitations,
  type SentInvitation,
  type Group,
  type GroupLesson,
  type RosterEntry,
} from '@/lib/courses';

interface ProgressRow {
  lesson_id: string;
  student_id: string;
  progress_percentage: number;
  completed: boolean;
  time_spent_seconds: number;
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  const { currentUser, role } = useAuthStore();
  const isTeacher = role === 'teacher';

  const [group, setGroup] = useState<Group | null>(null);
  const [lessons, setLessons] = useState<GroupLesson[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [invites, setInvites] = useState<SentInvitation[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [openNew, setOpenNew] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const { getCachedCourse, saveCourseToCache } = useCourseCache();
  const [studentEmail, setStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, LessonDraft>>({});
  const [editing, setEditing] = useState<GroupLesson | null>(null);
  const translatedText = useTranslatedTexts([group?.description, ...lessons.map(l => l.description)]);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [reuseMode, setReuseMode] = useState(false);
  const [reusable, setReusable] = useState<(GroupLesson & { groupName: string })[]>([]);
  const [loadingReusable, setLoadingReusable] = useState(false);

  useEffect(() => {
    if (!openNew || !isTeacher || !currentUser?.id || !groupId) return;
    let cancelled = false;
    setLoadingReusable(true);
    (async () => {
      const { data: owned, error } = await supabase.from('groups').select('id,name').eq('owner_id', currentUser.id).neq('id', groupId);
      if (error) { if (!cancelled) toast.error(error.message); return; }
      const ids = (owned || []).map(g => g.id);
      if (!ids.length) { if (!cancelled) setReusable([]); return; }
      const { data: sources, error: sourceError } = await supabase.from('group_lessons').select('*').in('group_id', ids).eq('created_by', currentUser.id).order('updated_at', { ascending: false });
      if (!cancelled) {
        if (sourceError) toast.error(sourceError.message);
        setReusable((sources || []).map(l => ({ ...l, content: l.content as unknown as GroupLesson['content'], status: l.status as GroupLesson['status'], groupName: owned?.find(g => g.id === l.group_id)?.name || '' })));
      }
    })().finally(() => { if (!cancelled) setLoadingReusable(false); });
    return () => { cancelled = true; };
  }, [openNew, isTeacher, currentUser?.id, groupId]);

  const reuseLesson = async (source: GroupLesson) => {
    if (!groupId || !currentUser?.id || generating) return;
    setGenerating(true);
    try {
      const draft = drafts[source.id];
      const payload = copiedLesson(draft || source, groupId, currentUser.id);
      const { data: copied, error } = await supabase.from('group_lessons').insert(payload).select().single();
      if (error) throw error;
      setLessons(prev => [...prev, copied as unknown as GroupLesson]);
      setOpenNew(false); setReuseMode(false);
      toast.success(lang === 'es' ? 'Lección copiada como borrador independiente.' : 'Lesson copied as an independent draft.');
    } catch (error) { toast.error(error instanceof Error ? error.message : t('courses.lessonError')); }
    finally { setGenerating(false); }
  };

  const load = async () => {
    if (!groupId) return;
    setIsLoading(true);
    const { data: g } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
    setGroup((g as Group) || null);
    setLessons(await fetchGroupLessons(groupId, !isTeacher));
    if (isTeacher) {
      const { data: savedDrafts } = await supabase.from('lesson_drafts').select('lesson_id,payload');
      setDrafts(Object.fromEntries((savedDrafts || []).map(d => [d.lesson_id, d.payload as unknown as LessonDraft])));
      setRoster(await fetchGroupRoster(groupId));
      setInvites(await fetchGroupInvitations(groupId));
      const { data: p } = await supabase
        .from('lesson_progress')
        .select('lesson_id, student_id, progress_percentage, completed, time_spent_seconds')
        .eq('group_id', groupId);
      setProgressRows(((p as any[]) || []) as ProgressRow[]);
    } else if (currentUser?.id) {
      const { data: p } = await supabase.from('lesson_progress')
        .select('lesson_id, student_id, progress_percentage, completed, time_spent_seconds')
        .eq('group_id', groupId).eq('student_id', currentUser.id);
      setProgressRows((p || []) as ProgressRow[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, role]);

  const handleCreateLesson = async () => {
    if (!groupId || !currentUser?.id || !title.trim()) return;
    if (generating) return;
    setGenerating(true);
    try {
      // Reuse an identical lesson (same title, focus and language) instead of spending AI credits again.
      const cacheTitle = `group:${title.trim()}|${(description.trim() || title.trim())}`;
      const cached = await getCachedCourse(cacheTitle, lang);
      const { data, error } = cached ? await supabase.functions.invoke('generate-course-content', { body: { operation: 'review', title: title.trim(), description: description.trim(), language: lang, lesson: cached } }) : await supabase.functions.invoke('generate-course-content', {
        body: {
          title: title.trim(),
          description: description.trim() || title.trim(),
          contentType: 'article',
          source: 'oer',
          language: lang,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.success || !data?.content?.introduction) throw new Error(data?.error || t('courses.lessonError'));
      const content = { ...(data?.content || {}), language: lang };
      if (!cached) saveCourseToCache(cacheTitle, lang, data.content);

      const { data: inserted, error: insertError } = await supabase
        .from('group_lessons')
        .insert({
          group_id: groupId,
          created_by: currentUser.id,
          title: title.trim(),
          description: description.trim(),
          content,
          status: 'draft',
        })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);

      setLessons((prev) => [...prev, inserted as unknown as GroupLesson]);
      setEditing(inserted as unknown as GroupLesson);
      setTitle('');
      setDescription('');
      setOpenNew(false);
      toast.success(t('courses.lessonCreated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('courses.lessonError'));
    } finally {
      setGenerating(false);
    }
  };

  const togglePublish = async (lesson: GroupLesson, publishChanges = false) => {
    const nextStatus = publishChanges || lesson.status !== 'published' ? 'published' : 'draft';
    const draft = nextStatus === 'published' ? drafts[lesson.id] : undefined;
    setPublishing(lesson.id);
    const { data: updated, error } = await supabase
      .from('group_lessons')
      .update({
        status: nextStatus,
        published_at: nextStatus === 'published' ? new Date().toISOString() : null,
        ...(draft ? { title: draft.title, description: draft.description, content: JSON.parse(JSON.stringify(draft.content)) } : {}),
      })
      .eq('id', lesson.id).select().single();
    setPublishing(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? updated as unknown as GroupLesson : l))
    );
    if (draft) {
      const { error: deleteError } = await supabase.from('lesson_drafts').delete().eq('lesson_id', lesson.id);
      if (!deleteError) setDrafts(prev => { const next = { ...prev }; delete next[lesson.id]; return next; });
    }
    toast.success(nextStatus === 'published' ? t('courses.published') : t('courses.unpublished'));
  };

  const deleteLesson = async (lessonId: string) => {
    const { error } = await supabase.from('group_lessons').delete().eq('id', lessonId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    toast.success(t('courses.lessonDeleted'));
  };

  const handleAddByEmail = async () => {
    if (!groupId || !studentEmail.trim()) return;
    setAddingStudent(true);
    const res = await enrollStudentByEmail(groupId, studentEmail.trim());
    setAddingStudent(false);
    if (!res.success) {
      const key =
        res.error === 'user_not_found'
          ? 'courses.emailNotFound'
          : res.error === 'self'
            ? 'courses.emailIsSelf'
          : res.error === 'not_student'
            ? 'courses.emailNotStudent'
          : res.error === 'already_enrolled'
            ? 'courses.alreadyEnrolled'
            : 'courses.addStudentError';
      toast.error(t(key));
      return;
    }
    setStudentEmail('');
    setRoster(await fetchGroupRoster(groupId));
    setInvites(await fetchGroupInvitations(groupId));
    toast.success(t('courses.studentAdded'));
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!groupId) return;
    const { error } = await removeStudent(groupId, studentId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRoster((prev) => prev.filter((r) => r.student_id !== studentId));
    toast.success(t('courses.studentRemoved'));
  };

  const studentAverage = (studentId: string) => {
    const rows = progressRows.filter((r) => r.student_id === studentId);
    if (lessons.length === 0) return 0;
    const total = rows.reduce((sum, r) => sum + (r.progress_percentage || 0), 0);
    return Math.round(total / lessons.length);
  };

  const lessonList = (
    <div className="space-y-4">
      {isTeacher && (
        <Dialog open={openNew} onOpenChange={(o) => { if (!generating) setOpenNew(o); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('courses.newLesson')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('courses.newLesson')}</DialogTitle>
              <DialogDescription>{t('courses.newLessonDesc')}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label={lang === 'es' ? 'Origen de la lección' : 'Lesson source'}>
              <Button variant={!reuseMode ? 'default' : 'outline'} role="tab" aria-selected={!reuseMode} disabled={generating} onClick={() => setReuseMode(false)}>{lang === 'es' ? 'Nueva lección' : 'New lesson'}</Button>
              <Button variant={reuseMode ? 'default' : 'outline'} role="tab" aria-selected={reuseMode} disabled={generating} onClick={() => setReuseMode(true)}><Copy className="mr-2 h-4 w-4" />{lang === 'es' ? 'Reutilizar una lección existente' : 'Reuse an existing lesson'}</Button>
            </div>
            {reuseMode ? <div className="space-y-3 max-h-96 overflow-y-auto">
              {loadingReusable ? <p role="status">{lang === 'es' ? 'Cargando lecciones…' : 'Loading lessons…'}</p> : !reusable.length ? <p>{lang === 'es' ? 'No hay lecciones propias en otros grupos.' : 'No lessons in your other groups.'}</p> : reusable.map(source => <Button key={source.id} variant="outline" className="h-auto w-full whitespace-normal justify-start text-left" disabled={generating} onClick={() => reuseLesson(source)}><Copy className="mr-2 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{source.title}<span className="block text-muted-foreground">{source.groupName}</span></span></Button>)}
            </div> : <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-title">{t('courses.lessonTitle')}</Label>
                <Input id="lesson-title" disabled={generating} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-desc">{t('courses.lessonDescription')}</Label>
                <Textarea id="lesson-desc" disabled={generating} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>}
            {generating && !reuseMode && <GenerationSteps lang={lang} />}
            {!reuseMode && <DialogFooter>
              <Button onClick={handleCreateLesson} disabled={generating || !title.trim()}>
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {t('courses.generateLesson')}
              </Button>
            </DialogFooter>}
          </DialogContent>
        </Dialog>
      )}

      {lessons.length === 0 ? (
        <p className="text-muted-foreground">{t('courses.noLessons')}</p>
      ) : (
        <div className="grid gap-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="break-words">{lesson.title}</CardTitle>
                  <Badge variant={lesson.status === 'published' ? 'default' : 'secondary'}>
                    {t(lesson.status === 'published' ? 'courses.statusPublished' : 'courses.statusDraft')}
                  </Badge>
                  {isTeacher && drafts[lesson.id] && <Badge variant="outline">{t('courses.pendingChanges')}</Badge>}
                </div>
                {isTeacher && <p className="break-words text-muted-foreground">{t(lesson.status === 'published' ? 'courses.visibleToStudents' : 'courses.hiddenFromStudents')}</p>}
                {lesson.description && (
                  <CardDescription className="break-words">{translatedText[lesson.description] || lesson.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {!isTeacher && (() => {
                  const row = progressRows.find(p => p.lesson_id === lesson.id);
                  const pct = row?.completed ? 100 : row?.progress_percentage || 0;
                  return <div className="space-y-2">
                    <p>{t('courses.yourProgress')}: <strong>{pct}%</strong></p>
                    <Progress value={pct} aria-label={t('courses.yourProgress')} />
                  </div>;
                })()}
                <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/courses/${groupId}/lessons/${lesson.id}`)}
                >
                  <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('courses.openLesson')}
                </Button>
                {isTeacher && (
                  <>
                    <Button variant="outline" onClick={() => setEditing(lesson)}><Pencil className="h-4 w-4" />{t('courses.editLesson')}</Button>
                    {lesson.status === 'published' && drafts[lesson.id] && <Button disabled={publishing === lesson.id} onClick={() => togglePublish(lesson, true)}><Send className="h-4 w-4" />{t('courses.publishChanges')}</Button>}
                    <Button disabled={publishing === lesson.id} variant="outline" onClick={() => togglePublish(lesson)}>
                      {lesson.status === 'published' ? (
                        <EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      {t(lesson.status === 'published' ? 'courses.unpublish' : 'courses.publish')}
                    </Button>
                    <Button variant="ghost" onClick={() => deleteLesson(lesson.id)}>
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('common.delete')}
                    </Button>
                  </>
                )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/courses')}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('common.back')}
          </Button>
          <h1 className="break-words font-bold">{group?.name || t('courses.studentTitle')}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : isTeacher ? (
          <Tabs defaultValue={new URLSearchParams(window.location.search).get('tab') === 'students' ? 'students' : 'lessons'}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="lessons">{t('courses.lessons')}</TabsTrigger>
              <TabsTrigger value="students">{t('courses.students')}</TabsTrigger>
            </TabsList>
            <TabsContent value="lessons" className="pt-4">
              {lessonList}
            </TabsContent>
            <TabsContent value="students" className="space-y-4 pt-4">
              {group && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('courses.inviteTitle')}</CardTitle>
                    <CardDescription className="break-words">{t('courses.inviteDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted px-3 py-1 font-mono tracking-widest">
                      {group.join_code}
                    </span>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(group.join_code);
                        toast.success(t('courses.codeCopied'));
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('courses.copyCode')}
                    </Button>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>{t('courses.addByEmailTitle')}</CardTitle>
                  <CardDescription className="break-words">
                    {t('courses.addByEmailDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddByEmail();
                    }}
                  >
                    <div className="min-w-[200px] flex-1 space-y-2">
                      <Label htmlFor="student-email">{t('courses.studentEmail')}</Label>
                      <Input
                        id="student-email"
                        type="email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="alumno@correo.com"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={addingStudent}>
                      {addingStudent ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      {t('courses.addStudent')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('courses.sentInvitations')}</CardTitle>
                  <CardDescription>{t('courses.sentInvitationsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {invites.length === 0 ? (
                    <p className="text-muted-foreground">{t('courses.noSentInvitations')}</p>
                  ) : (
                    <ul className="space-y-3">
                      {invites.map((inv) => {
                        const fmt = (d: string | null) => d ? new Date(d).toLocaleString(lang) : '—';
                        const statusKey = inv.status === 'accepted' ? 'inviteAccepted' : inv.status === 'declined' ? 'inviteDeclined' : inv.seen_at ? 'inviteSeen' : 'inviteNotSeen';
                        return (
                          <li key={inv.id} className="rounded-md border p-3 space-y-1 break-words">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{inv.student_name || inv.student_email || t('courses.unnamedStudent')}</span>
                              <Badge variant={inv.status === 'declined' ? 'destructive' : inv.status === 'accepted' ? 'default' : 'secondary'}>{t(`courses.${statusKey}`)}</Badge>
                            </div>
                            {inv.student_email && <p className="text-muted-foreground">{inv.student_email}</p>}
                            <p>{t('courses.inviteSentAt')}: {fmt(inv.sent_at)}</p>
                            <p>{t('courses.inviteSeenAt')}: {fmt(inv.seen_at)}</p>
                            <p>{t('courses.inviteRespondedAt')}: {fmt(inv.responded_at)}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
              {roster.length === 0 ? (
                <p className="text-muted-foreground">{t('courses.noStudents')}</p>
              ) : (

                roster.map((student) => (
                  <Card key={student.student_id}>
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center gap-2 break-words">
                        <Users className="h-4 w-4" aria-hidden="true" />
                        {student.student_name || t('courses.unnamedStudent')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          {t('courses.averageProgress')}: {studentAverage(student.student_id)}%
                        </p>
                        <Progress value={studentAverage(student.student_id)} />
                      </div>
                      <Button variant="outline" onClick={() => handleRemoveStudent(student.student_id)}>
                        {t('courses.removeStudent')}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        ) : (
          lessonList
        )}
      </main>
      {editing && <LessonEditor key={editing.id} lesson={editing} initial={drafts[editing.id] || { title: editing.title, description: editing.description, content: editing.content }} onClose={() => setEditing(null)} onSaved={draft => setDrafts(prev => ({ ...prev, [editing.id]: draft }))} />}
    </div>
  );
}
