import type { ReactNode } from 'react';
import { ArrowLeft, Eye, ZoomIn, ZoomOut, Sun, Moon, Contrast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageSelector from '@/components/LanguageSelector';
import { useStore } from '@/store/useStore';
import { useTranslation } from 'react-i18next';

export default function LessonToolbar({ title, onBack, actions }: { title: string; onBack: () => void; actions?: ReactNode }) {
  const { t, i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  const { visualProfile, updateVisualProfile, currentTheme, setTheme, readingGuideEnabled, toggleReadingGuide } = useStore();
  const resize = (delta: number) => { if (visualProfile) updateVisualProfile({ preferences: { ...visualProfile.preferences, fontSize: Math.max(16, Math.min(48, Number(visualProfile.preferences.fontSize) + delta)) } }); };
  return <header className="sticky top-0 z-40 border-b bg-background">
    <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-4">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />{es ? 'Volver' : 'Back'}</Button>
      <h1 className="min-w-0 flex-1 break-words font-bold">{title}</h1>
      <div className="flex flex-wrap gap-2 items-center">
        <LanguageSelector />
        <Button variant="outline" size="icon" onClick={() => resize(-2)} aria-label={es ? 'Reducir fuente' : 'Decrease font'}><ZoomOut /></Button>
        <Button variant="outline" size="icon" onClick={() => resize(2)} aria-label={es ? 'Aumentar fuente' : 'Increase font'}><ZoomIn /></Button>
        <Button variant="outline" size="icon" onClick={() => setTheme(currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'high-contrast' : 'light')} aria-label={t('navigation.changeTheme')}>
          {currentTheme === 'light' ? <Sun /> : currentTheme === 'dark' ? <Moon /> : <Contrast />}
        </Button>
        <Button variant={readingGuideEnabled ? 'default' : 'outline'} size="icon" onClick={toggleReadingGuide} aria-pressed={readingGuideEnabled} aria-label={es ? 'Guía de lectura' : 'Reading guide'}><Eye /></Button>
        {actions}
      </div>
    </div>
  </header>;
}