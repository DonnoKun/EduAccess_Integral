/**
 * EduAccess - Group detail
 * Teacher: manage lessons (AI generated or manual), publish, and follow student progress.
 * Student: browse published lessons of the group.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, Copy, Loader2, Plus, Send, Trash2, Users, EyeOff } from 'lucide-react';
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
  removeStudent,
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
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [openNew, setOpenNew] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  const load = async () => {
    if (!groupId) return;
    setIsLoading(true);
    const { data: g } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
    setGroup((g as Group) || null);
    setLessons(await fetchGroupLessons(groupId, !isTeacher));
    if (isTeacher) {
      setRoster(await fetchGroupRoster(groupId));
      const { data: p } = await supabase
        .from('lesson_progress')
        .select('lesson_id, student_id, progress_percentage, completed, time_spent_seconds')
        .eq('group_id', groupId);
      setProgressRows(((p as any[]) || []) as ProgressRow[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, role]);

  const handleCreateLesson = async () => {
    if (!groupId || !currentUser?.id || !title.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-course-content', {
        body: {
          title: title.trim(),
          description: description.trim() || title.trim(),
          contentType: 'article',
          source: 'oer',
          language: lang,
        },
      });
      if (error) throw new Error(error.message);
      const content = data?.content || {};

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

  const togglePublish = async (lesson: GroupLesson) => {
    const nextStatus = lesson.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('group_lessons')
      .update({
        status: nextStatus,
        published_at: nextStatus === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', lesson.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, status: nextStatus as GroupLesson['status'] } : l))
    );
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
        <Dialog open={openNew} onOpenChange={setOpenNew}>
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-title">{t('courses.lessonTitle')}</Label>
                <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-desc">{t('courses.lessonDescription')}</Label>
                <Textarea id="lesson-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateLesson} disabled={generating || !title.trim()}>
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {t('courses.generateLesson')}
              </Button>
            </DialogFooter>
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
                </div>
                {lesson.description && (
                  <CardDescription className="break-words">{lesson.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/courses/${groupId}/lessons/${lesson.id}`)}
                >
                  <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('courses.openLesson')}
                </Button>
                {isTeacher && (
                  <>
                    <Button variant="outline" onClick={() => togglePublish(lesson)}>
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
          <Tabs defaultValue="lessons">
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
    </div>
  );
}
