import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const LEVELS = ['preschool', 'primary', 'secondary', 'highSchool', 'university', 'adult'] as const;

/** Level picker with a free-text "Other" option. Stores the translated label as text. */
export default function LevelField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const labels = LEVELS.map(k => t(`courses.levels.${k}`));
  const [other, setOther] = useState(!!value && !labels.includes(value));
  const selected = other ? '__other' : value;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t('courses.groupLevel')}</Label>
      <select
        id={id}
        value={selected}
        onChange={e => {
          if (e.target.value === '__other') { setOther(true); onChange(''); }
          else { setOther(false); onChange(e.target.value); }
        }}
        className="flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">{t('courses.levels.choose')}</option>
        {labels.map(l => <option key={l} value={l}>{l}</option>)}
        <option value="__other">{t('courses.levels.other')}</option>
      </select>
      {other && (
        <Input id={`${id}-other`} aria-label={t('courses.levels.otherLabel')} placeholder={t('courses.levels.otherLabel')} value={value} onChange={e => onChange(e.target.value)} autoFocus />
      )}
    </div>
  );
}
