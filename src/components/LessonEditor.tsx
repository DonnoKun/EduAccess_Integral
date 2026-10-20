import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { GroupLesson, LessonContent } from '@/lib/courses';

export interface LessonDraft { title: string; description: string; content: LessonContent }

type TextNode = string | TextNode[] | { [key: string]: TextNode };

function Fields({ value, onChange, path = 'content' }: { value: TextNode; onChange: (value: TextNode) => void; path?: string }) {
  const { t } = useTranslation();
  if (typeof value === 'string') return <div className="space-y-2"><Label htmlFor={path}>{t(`courses.editFields.${path.split('.').at(-1)}`, { defaultValue: path.split('.').at(-1) })}</Label><Textarea id={path} value={value} rows={4} onChange={e => onChange(e.target.value)} className="min-h-28" /></div>;
  if (Array.isArray(value)) return <div className="space-y-6">{value.map((item, i) => <fieldset key={i} className="min-w-0 space-y-3 border-t pt-4"><legend className="font-semibold">{i + 1}</legend><Fields value={item} path={`${path}.${i}`} onChange={next => onChange(value.map((old, index) => index === i ? next : old))} /></fieldset>)}</div>;
  if (!value || typeof value !== 'object') return null;
  return <div className="space-y-4">{Object.entries(value).filter(([key]) => key !== 'language').map(([key, item]) => <Fields key={key} value={item} path={`${path}.${key}`} onChange={next => onChange({ ...value, [key]: next })} />)}</div>;
}

export default function LessonEditor({ lesson, initial, onClose, onSaved }: { lesson: GroupLesson; initial: LessonDraft; onClose: () => void; onSaved: (draft: LessonDraft) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('lesson_drafts').upsert({ lesson_id: lesson.id, payload: JSON.parse(JSON.stringify(draft)), updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error(t('courses.editError')); return; }
    onSaved(draft);
    toast.success(t('courses.draftSaved'));
    onClose();
  };
  return <Dialog open onOpenChange={open => { if (!open && !saving && (JSON.stringify(initial) === JSON.stringify(draft) || window.confirm(t('courses.discardChanges')))) onClose(); }}>
    <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto">
      <DialogHeader><DialogTitle>{t('courses.editLesson')}</DialogTitle><DialogDescription>{t('courses.editNotice')}</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <Label htmlFor="edit-title">{t('courses.lessonTitle')}</Label><Input id="edit-title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
        <Label htmlFor="edit-description">{t('courses.lessonDescription')}</Label><Textarea id="edit-description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
        {Object.entries(draft.content).filter(([key]) => key !== 'language').map(([key, value]) => <details key={key} className="border-t pt-3"><summary className="cursor-pointer font-semibold">{t(`courses.editFields.${key}`, { defaultValue: key })}</summary><div className="pt-4"><Fields path={`content.${key}`} value={value as TextNode} onChange={next => setDraft({ ...draft, content: { ...draft.content, [key]: next } })} /></div></details>)}
      </div>
      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-background pt-4">
        <Button disabled={saving || !draft.title.trim()} onClick={save} className="h-auto whitespace-normal">{saving ? <Loader2 className="animate-spin" /> : <Save />}{t('courses.saveDraft')}</Button>
        <Button variant="outline" disabled={saving} onClick={() => { if (JSON.stringify(initial) === JSON.stringify(draft) || window.confirm(t('courses.discardChanges'))) onClose(); }}>{t('courses.cancel')}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}