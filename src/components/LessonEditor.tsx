import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2, Plus, Trash2, ArrowUp, ArrowDown, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { GroupLesson, LessonContent, LessonSection, LessonExample, LessonExercise, LessonSource } from '@/lib/courses';

export interface LessonDraft { title: string; description: string; content: LessonContent }

type Field<T> = { key: keyof T; label: string; long?: boolean };

/** Generic editable list: add, remove and reorder items. No AI is used while editing. */
function ListEditor<T extends object>({ title, items, fields, blank, onChange, extra, idPrefix }: {
  title: string; items: T[]; fields: Field<T>[]; blank: () => T; onChange: (items: T[]) => void;
  extra?: (item: T, set: (item: T) => void, index: number) => React.ReactNode; idPrefix: string;
}) {
  const { t } = useTranslation();
  const set = (i: number, item: T) => onChange(items.map((old, idx) => idx === i ? item : old));
  const move = (i: number, d: number) => { const next = [...items]; [next[i], next[i + d]] = [next[i + d], next[i]]; onChange(next); };
  return (
    <details className="border-t pt-3">
      <summary className="cursor-pointer font-semibold">{title} ({items.length})</summary>
      <div className="space-y-4 pt-4">
        {items.map((item, i) => (
          <fieldset key={i} className="min-w-0 space-y-3 rounded-md border p-3">
            <legend className="px-1 font-semibold">{title} {i + 1}</legend>
            {fields.map(f => {
              const id = `${idPrefix}-${i}-${String(f.key)}`;
              const v = (item[f.key] as unknown as string) || '';
              return <div key={id} className="space-y-1"><Label htmlFor={id}>{f.label}</Label>{f.long
                ? <Textarea id={id} rows={4} value={v} onChange={e => set(i, { ...item, [f.key]: e.target.value })} />
                : <Input id={id} value={v} onChange={e => set(i, { ...item, [f.key]: e.target.value })} />}</div>;
            })}
            {extra?.(item, next => set(i, next), i)}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('courses.edit.moveUp')}><ArrowUp /></Button>
              <Button type="button" size="sm" variant="outline" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t('courses.edit.moveDown')}><ArrowDown /></Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => window.confirm(t('courses.edit.confirmRemove')) && onChange(items.filter((_, idx) => idx !== i))}><Trash2 />{t('courses.edit.remove')}</Button>
            </div>
          </fieldset>
        ))}
        <Button type="button" variant="outline" onClick={() => onChange([...items, blank()])}><Plus />{t('courses.edit.add')}</Button>
      </div>
    </details>
  );
}

export default function LessonEditor({ lesson, initial, onClose, onSaved }: { lesson: GroupLesson; initial: LessonDraft; onClose: () => void; onSaved: (draft: LessonDraft) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const c = draft.content;
  const setC = (patch: Partial<LessonContent>) => setDraft({ ...draft, content: { ...c, ...patch } });
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const close = () => { if (!saving && (!dirty || window.confirm(t('courses.discardChanges')))) onClose(); };

  const save = async () => {
    setSaving(true);
    // Drop empty key points and blank image requests so no image is generated for nothing.
    const sections = (draft.content.sections || []).map(({ image_prompt, image_alt, ...s }) => ({
      ...s, keyPoints: (s.keyPoints || []).map(k => k.trim()).filter(Boolean),
      ...(image_prompt?.trim() ? { image_prompt: image_prompt.trim(), image_alt: image_alt?.trim() || image_prompt.trim() } : {}),
    }));
    const clean = { ...draft, content: { ...draft.content, sections } };
    const { error } = await supabase.from('lesson_drafts').upsert({ lesson_id: lesson.id, payload: JSON.parse(JSON.stringify(clean)), updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error(t('courses.editError')); return; }
    onSaved(clean);
    toast.success(t('courses.draftSaved'));
    onClose();
  };

  const imageEditor = (s: LessonSection, set: (s: LessonSection) => void, i: number) => {
    const id = `sec-${i}-image`;
    return s.image_prompt !== undefined && s.image_prompt !== null ? (
      <div className="space-y-2 rounded-md bg-muted p-3">
        <Label htmlFor={id} className="flex items-center gap-2"><ImageIcon className="h-4 w-4" aria-hidden="true" />{t('courses.edit.imageWanted')}</Label>
        <Textarea id={id} rows={2} value={s.image_prompt} placeholder={t('courses.edit.imagePlaceholder')} onChange={e => set({ ...s, image_prompt: e.target.value })} />
        <Label htmlFor={`${id}-alt`}>{t('courses.edit.imageAlt')}</Label>
        <Input id={`${id}-alt`} value={s.image_alt || ''} onChange={e => set({ ...s, image_alt: e.target.value })} />
        <p className="text-sm text-muted-foreground">{t('courses.edit.imageCredits')}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => { const { image_prompt, image_alt, ...rest } = s; void image_prompt; void image_alt; set(rest); }}><Trash2 />{t('courses.edit.removeImage')}</Button>
      </div>
    ) : (
      <Button type="button" size="sm" variant="outline" onClick={() => set({ ...s, image_prompt: '', image_alt: '' })}><ImageIcon />{t('courses.edit.addImage')}</Button>
    );
  };

  const keyPoints = (s: LessonSection, set: (s: LessonSection) => void, i: number) => (
    <div className="space-y-1">
      <Label htmlFor={`sec-${i}-kp`}>{t('courses.edit.keyPoints')}</Label>
      <Textarea id={`sec-${i}-kp`} rows={3} value={(s.keyPoints || []).join('\n')} onChange={e => set({ ...s, keyPoints: e.target.value.split('\n') })} />
      <p className="text-sm text-muted-foreground">{t('courses.edit.onePerLine')}</p>
    </div>
  );

  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto">
      <DialogHeader><DialogTitle>{t('courses.editLesson')}</DialogTitle><DialogDescription>{t('courses.editNotice')}</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1"><Label htmlFor="edit-title">{t('courses.lessonTitle')}</Label><Input id="edit-title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="edit-description">{t('courses.lessonDescription')}</Label><Textarea id="edit-description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="edit-intro">{t('courses.editFields.introduction', { defaultValue: 'Introduction' })}</Label><Textarea id="edit-intro" rows={6} value={c.introduction || ''} onChange={e => setC({ introduction: e.target.value })} /></div>
        <ListEditor<LessonSection> idPrefix="sec" title={t('courses.edit.sections')} items={c.sections || []} onChange={sections => setC({ sections })}
          blank={() => ({ title: '', content: '', keyPoints: [] })}
          fields={[{ key: 'title', label: t('courses.edit.title') }, { key: 'content', label: t('courses.edit.content'), long: true }]}
          extra={(s, set, i) => <>{keyPoints(s, set, i)}{imageEditor(s, set, i)}</>} />
        <ListEditor<LessonExample> idPrefix="ex" title={t('courses.edit.examples')} items={c.examples || []} onChange={examples => setC({ examples })}
          blank={() => ({ title: '', description: '' })}
          fields={[{ key: 'title', label: t('courses.edit.title') }, { key: 'description', label: t('courses.edit.content'), long: true }]} />
        <ListEditor<LessonExercise> idPrefix="exr" title={t('courses.edit.exercises')} items={c.exercises || []} onChange={exercises => setC({ exercises })}
          blank={() => ({ question: '', hint: '', answer_keywords: '', solution: '' })}
          fields={[{ key: 'question', label: t('courses.edit.question'), long: true }, { key: 'hint', label: t('courses.edit.hint') }, { key: 'answer_keywords', label: t('courses.edit.keywords') }, { key: 'solution', label: t('courses.edit.solution'), long: true }]} />
        <div className="space-y-1"><Label htmlFor="edit-summary">{t('courses.editFields.summary', { defaultValue: 'Summary' })}</Label><Textarea id="edit-summary" rows={4} value={c.summary || ''} onChange={e => setC({ summary: e.target.value })} /></div>
        <ListEditor<LessonSource> idPrefix="src" title={t('courses.edit.sources')} items={c.sources || []} onChange={sources => setC({ sources })}
          blank={() => ({ name: '', url: 'https://' })}
          fields={[{ key: 'name', label: t('courses.edit.title') }, { key: 'url', label: 'URL' }, { key: 'description', label: t('courses.edit.content') }]} />
      </div>
      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-background pt-4">
        <Button disabled={saving || !draft.title.trim()} onClick={save} className="h-auto whitespace-normal">{saving ? <Loader2 className="animate-spin" /> : <Save />}{t('courses.saveDraft')}</Button>
        <Button variant="outline" disabled={saving} onClick={close}>{t('courses.cancel')}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
