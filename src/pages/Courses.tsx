/**
 * EduAccess - Courses / Groups hub
 * Teachers: create and manage their groups. Students: join by code and see enrolled groups.
 * Independent from the self-managed "direct mode" library.
 */

import LevelField from '@/components/LevelField';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Users, GraduationCap, Copy, RefreshCw, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslatedTexts } from '@/hooks/useTranslatedTexts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import {
  createGroup,
  deleteGroup,
  updateGroup,
  fetchStudentGroups,
  fetchTeacherGroups,
  joinGroupByCode,
  fetchMyInvitations,
  acceptInvitation,
  declineInvitation,
  type GroupInvitation,
  regenerateJoinCode,
  type Group,
} from '@/lib/courses';

export default function CoursesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, role } = useAuthStore();
  const isTeacher = role === 'teacher';

  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Teacher create form
  const [openCreate, setOpenCreate] = useState(() => new URLSearchParams(window.location.search).get('create') === '1');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('');
  const [creating, setCreating] = useState(false);

  // Teacher edit / delete
  const [editing, setEditing] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);
  const translatedText = useTranslatedTexts(groups.map(g => g.description));
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    const payload = { name: editing.name.trim(), description: editing.description.trim(), level: editing.level.trim() };
    const { error } = await updateGroup(editing.id, payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    setGroups((prev) => prev.map((g) => (g.id === editing.id ? { ...g, ...payload } : g)));
    setEditing(null);
    toast.success(t('courses.groupUpdated'));
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await deleteGroup(deleting.id);
    if (error) return toast.error(error.message);
    setGroups((prev) => prev.filter((g) => g.id !== deleting.id));
    setDeleting(null);
    toast.success(t('courses.groupDeleted'));
  };

  // Student join form
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);

  const handleInvitation = async (inv: GroupInvitation, accept: boolean) => {
    if (accept) {
      if (!(await acceptInvitation(inv.id))) { toast.error(t('courses.addStudentError')); return; }
      toast.success(t('courses.joined', { name: inv.group_name }));
    } else {
      await declineInvitation(inv.id);
      toast.success(t('courses.invitationDeclined'));
    }
    load();
  };

  const load = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    const data = isTeacher
      ? await fetchTeacherGroups(currentUser.id)
      : await fetchStudentGroups(currentUser.id);
    setGroups(data);
    if (!isTeacher) setInvitations(await fetchMyInvitations());
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, role]);

  const handleCreate = async () => {
    if (!currentUser?.id || !name.trim()) return;
    setCreating(true);
    const { group, error } = await createGroup({
      ownerId: currentUser.id,
      name: name.trim(),
      description: description.trim(),
      level: level.trim(),
    });
    setCreating(false);
    if (error || !group) {
      toast.error(error || t('courses.createError'));
      return;
    }
    toast.success(t('courses.createdWithCode', { code: group.join_code }));
    setName('');
    setDescription('');
    setLevel('');
    setOpenCreate(false);
    setGroups((prev) => [group, ...prev]);
  };

  const handleJoin = async () => {
    if (!currentUser?.id || !code.trim()) return;
    setJoining(true);
    const { group, errorKey } = await joinGroupByCode(code, currentUser.id);
    setJoining(false);
    if (errorKey) {
      toast.error(t(`courses.join_${errorKey}`));
      return;
    }
    toast.success(t('courses.joined', { name: group?.name }));
    setCode('');
    load();
  };

  const copyCode = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(t('courses.codeCopied'));
  };

  const handleRegenerate = async (groupId: string) => {
    const { code: newCode, error } = await regenerateJoinCode(groupId);
    if (error || !newCode) {
      toast.error(error || t('courses.createError'));
      return;
    }
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, join_code: newCode } : g)));
    toast.success(t('courses.codeRegenerated'));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('common.back')}
          </Button>
          <h1 className="flex items-center gap-2 font-bold">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
            {isTeacher ? t('courses.teacherTitle') : t('courses.studentTitle')}
          </h1>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        {isTeacher ? (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('courses.createGroup')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('courses.createGroup')}</DialogTitle>
                <DialogDescription>{t('courses.createGroupDesc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">{t('courses.groupName')}</Label>
                  <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Matemáticas 1A" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-desc">{t('courses.groupDescription')}</Label>
                  <Textarea id="group-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <LevelField id="group-level" value={level} onChange={setLevel} />
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  {t('courses.createGroup')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          {invitations.length > 0 && (
            <Card className="mb-6" aria-live="polite">
              <CardHeader>
                <CardTitle>{t('courses.invitationsTitle')}</CardTitle>
                <CardDescription>{t('courses.invitationsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                      <span className="font-medium break-words">{inv.group_name}{inv.group_level ? ` · ${inv.group_level}` : ''}</span>
                      <span className="flex flex-wrap gap-2">
                        <Button onClick={() => handleInvitation(inv, true)}>{t('courses.acceptInvitation')}</Button>
                        <Button variant="outline" onClick={() => handleInvitation(inv, false)}>{t('courses.declineInvitation')}</Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t('courses.joinTitle')}</CardTitle>
              <CardDescription>{t('courses.joinDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label htmlFor="join-code">{t('courses.joinCode')}</Label>
                <Input
                  id="join-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC1234"
                  className="uppercase tracking-widest"
                />
              </div>
              <Button onClick={handleJoin} disabled={joining || !code.trim()}>
                {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {t('courses.join')}
              </Button>
            </CardContent>
          </Card>
        )}

        <section aria-label={t('courses.myGroups')} className="space-y-4">
          <h2 className="font-semibold">{t('courses.myGroups')}</h2>
          {isLoading ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
          ) : groups.length === 0 ? (
            <p className="text-muted-foreground">{t('courses.noGroups')}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <CardTitle className="break-words">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription className="break-words">{translatedText[group.description] || group.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {group.level && (
                      <p className="text-muted-foreground">{t('courses.groupLevel')}: {group.level}</p>
                    )}
                    {isTeacher && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-muted px-3 py-1 font-mono tracking-widest">
                          {group.join_code}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyCode(group.join_code)}
                          aria-label={t('courses.copyCode')}
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate(group.id)}
                          aria-label={t('courses.regenerateCode')}
                        >
                          <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => navigate(`/courses/${group.id}`)}>
                        <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t('courses.open')}
                      </Button>
                      {isTeacher && (
                        <>
                          <Button variant="outline" onClick={() => setEditing({ ...group })}>
                            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                            {t('courses.editGroup')}
                          </Button>
                          <Button variant="destructive" onClick={() => setDeleting(group)}>
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                            {t('courses.deleteGroup')}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('courses.editGroup')}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">{t('courses.groupName')}</Label>
                  <Input id="edit-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-desc">{t('courses.groupDescription')}</Label>
                  <Textarea id="edit-desc" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <LevelField id="edit-level" value={editing.level} onChange={(v) => setEditing({ ...editing, level: v })} />
              </div>
            )}
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>{t('courses.cancel')}</Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editing?.name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {t('courses.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('courses.deleteGroup')}</AlertDialogTitle>
              <AlertDialogDescription>{t('courses.deleteConfirm', { name: deleting?.name })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-wrap gap-2">
              <AlertDialogCancel>{t('courses.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('courses.deleteGroup')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
