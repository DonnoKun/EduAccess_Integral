import { useEffect, useRef, useState } from 'react';
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
import LessonQualityPanel from '@/components/LessonQualityPanel';
import { recordQualityReview } from '@/lib/lessonQualityReport';

import { translateLesson } from '@/lib/lessonAssessment';
import type { LessonDraft } from '@/lib/lessonRevision';
export type { LessonDraft } from '@/lib/lessonRevision';

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
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationFailed, setTranslationFailed] = useState(false);
  const [translationAttempt, setTranslationAttempt] = useState(0);
  const language = i18n.language.startsWith('en') ? 'en' : 'es';
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    let cancelled = false;
    setTranslating(true); setTranslationFailed(false);
    translateLesson(draftRef.current, language).then(value => {
      if (!cancelled) setDraft(value);
    }).catch(() => { if (!cancelled) setTranslationFailed(true); })
      .finally(() => { if (!cancelled) setTranslating(false); });
    return () => { cancelled = true; };
  }, [language, translationAttempt]);
  const c = draft.content;
  const markStale = (content: LessonContent): LessonContent => ({ ...content, ...(content.quality ? { quality: { ...content.quality, status: 'stale' as const } } : {}) });
  const setC = (patch: Partial<LessonContent>) => setDraft(prev => ({ ...prev, content: markStale({ ...prev.content, ...patch }) }));
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const close = () => { if (!saving && !reviewing && !translating && (!dirty || window.confirm(t('courses.discardChanges')))) onClose(); };

  const persist = async (value: LessonDraft) => {
    const { error } = await supabase.from('lesson_drafts').upsert({ lesson_id: lesson.id, payload: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() });
    if (error) throw error;
    setDraft(value);
    onSaved(value);
  };

  const reviewedDraft = async (value: LessonDraft, sectionIndex?: number): Promise<LessonDraft> => {
    const { data, error } = await supabase.functions.invoke('generate-course-content', { body: {
      operation: sectionIndex === undefined ? 'review' : 'regenerate_section',
      title: value.title, description: value.description, language, lesson: value.content, sectionIndex,
    } });
    if (error || !data?.success || data.content?.quality?.status !== 'reviewed') throw new Error('Review unavailable');
    return { ...value, content: recordQualityReview(value.content, data.content) };
  };

  const assess = async (sectionIndex?: number) => {
    if (reviewing || saving || translating || translationFailed) return;
    setReviewing(true);
    try {
      const value = await reviewedDraft(draft, sectionIndex);
      await persist(value);
      toast.success(language === 'es' ? 'Reporte actualizado y borrador guardado. No se ha publicado.' : 'Report updated and draft saved. It has not been published.');
    } catch {
      toast.error(language === 'es' ? 'No se pudo actualizar y guardar el reporte. Se conservan tus cambios; puedes reintentar.' : 'Could not update and save the report. Your changes are preserved; you can retry.');
    } finally { setReviewing(false); }
  };
  const focusFlag = (sectionIndex?: number, exerciseIndex?: number) => {
    const field = document.getElementById(sectionIndex !== undefined ? `sec-${sectionIndex}-content` : `exr-${exerciseIndex}-question`);
    const details = field?.closest('details');
    if (details) details.open = true;
    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const save = async () => {
    if (saving || reviewing || translating || translationFailed) return;
    setSaving(true);
    const sections = (draft.content.sections || []).map(({ image_prompt, image_alt, ...s }) => ({
      ...s, keyPoints: (s.keyPoints || []).map(k => k.trim()).filter(Boolean),
      ...(image_prompt?.trim() ? { image_prompt: image_prompt.trim(), image_alt: image_alt?.trim() || image_prompt.trim() } : {}),
    }));
    let clean: LessonDraft = { ...draft, content: { ...draft.content, language, sections } };
    try {
      if (!clean.content.quality || clean.content.quality.status !== 'reviewed') {
        // Save edits even if advisory inference fails, without pretending the old report is current.
        await persist(clean);
        clean = await reviewedDraft(clean);
      }
      await persist(clean);
      toast.success(language === 'es' ? 'Borrador y reporte guardados. Solo será visible al publicarlo.' : 'Draft and report saved. It becomes visible only when published.');
      onClose();
    } catch {
      toast.error(language === 'es' ? 'No se pudo completar la actualización del reporte. El editor sigue abierto para reintentar; no se ha publicado.' : 'The report update could not finish. The editor remains open for retry; nothing was published.');
    } finally { setSaving(false); }
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
        {translating && <p role="status">{t('courses.translating')}</p>}
        {translationFailed && <div role="alert" className="space-y-2"><p>{t('courses.translationFailed')}</p><Button variant="outline" onClick={() => setTranslationAttempt(n => n + 1)}>{language === 'es' ? 'Reintentar traducción' : 'Retry translation'}</Button></div>}
        {!translating && <LessonQualityPanel quality={c.quality} history={c.quality_history} lessonTitle={draft.title} busy={saving || reviewing || translating || translationFailed} onReview={() => assess()} onEdit={focusFlag} onRegenerate={assess} />}
        {!translating && <fieldset disabled={reviewing || saving || translating || translationFailed} className="min-w-0 space-y-4">
        <div className="space-y-1"><Label htmlFor="edit-title">{t('courses.lessonTitle')}</Label><Input id="edit-title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value, content: markStale(c) })} /></div>
        <div className="space-y-1"><Label htmlFor="edit-description">{t('courses.lessonDescription')}</Label><Textarea id="edit-description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value, content: markStale(c) })} /></div>
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
        </fieldset>}
      </div>
      <div className="sticky bottom-[var(--mobile-nav-h,0px)] transition-[bottom] duration-200 md:bottom-0 z-30 flex flex-wrap gap-2 border-t bg-background py-4">
        <Button disabled={saving || reviewing || translating || translationFailed || !draft.title.trim()} onClick={save} className="h-auto whitespace-normal">{saving ? <Loader2 className="animate-spin" /> : <Save />}{!c.quality || c.quality.status !== 'reviewed' ? (language === 'es' ? 'Guardar y actualizar reporte' : 'Save and update report') : t('courses.saveDraft')}</Button>
        <Button variant="outline" disabled={saving || reviewing || translating} onClick={close}>{t('courses.cancel')}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
