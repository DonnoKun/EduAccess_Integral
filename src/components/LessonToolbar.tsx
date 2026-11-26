import type { ReactNode } from 'react';
import { ArrowLeft, Eye, ZoomIn, ZoomOut, Sun, Moon, Contrast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageSelector from '@/components/LanguageSelector';
import { useStore } from '@/store/useStore';
import { useTranslation } from 'react-i18next';
import { useProfileSync } from '@/hooks/useProfileSync';

export default function LessonToolbar({ title, onBack, actions }: { title: string; onBack: () => void; actions?: ReactNode }) {
  const { t, i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  const { visualProfile, updateVisualProfile, currentTheme, setTheme, readingGuideEnabled, toggleReadingGuide } = useStore();
  useProfileSync();
  const changeTheme = () => {
    const next = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'high-contrast' : 'light';
    setTheme(next);
  };
  const resize = (delta: number) => { if (visualProfile) updateVisualProfile({ preferences: { ...visualProfile.preferences, fontSize: Math.max(16, Math.min(48, Number(visualProfile.preferences.fontSize) + delta)) } }); };
  return <header className="z-40 border-b bg-background md:sticky md:top-0">
    {/* Mobile: header scrolls away and tools share one row so the lesson keeps the screen. */}
    <div className="container mx-auto flex flex-wrap items-center gap-2 px-3 py-2 md:gap-3 md:px-4 md:py-4">
      <Button variant="ghost" onClick={onBack} aria-label={es ? 'Volver' : 'Back'} className="px-2 md:px-4"><ArrowLeft className="h-4 w-4 md:mr-2" /><span className="sr-only md:not-sr-only">{es ? 'Volver' : 'Back'}</span></Button>
      <h1 className="order-last basis-full min-w-0 break-words font-bold md:order-none md:basis-auto md:flex-1">{title}</h1>
      <div className="ml-auto flex flex-wrap justify-end gap-1.5 items-center md:ml-0 md:gap-2">
        <LanguageSelector />
        <Button variant="outline" size="icon" onClick={() => resize(-2)} aria-label={es ? 'Reducir fuente' : 'Decrease font'}><ZoomOut /></Button>
        <Button variant="outline" size="icon" onClick={() => resize(2)} aria-label={es ? 'Aumentar fuente' : 'Increase font'}><ZoomIn /></Button>
        <Button variant="outline" size="icon" onClick={changeTheme} aria-label={t('navigation.changeTheme')}>
          {currentTheme === 'light' ? <Sun /> : currentTheme === 'dark' ? <Moon /> : <Contrast />}
        </Button>
        <Button variant={readingGuideEnabled ? 'default' : 'outline'} size="icon" onClick={toggleReadingGuide} aria-pressed={readingGuideEnabled} aria-label={es ? 'Guía de lectura' : 'Reading guide'}><Eye /></Button>
        {actions}
      </div>
    </div>
  </header>;
}