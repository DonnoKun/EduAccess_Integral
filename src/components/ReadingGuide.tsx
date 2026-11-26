/**
 * EduAccess - Reading Guide Component
 * Horizontal line that follows the mouse or the finger to aid reading.
 * The on/off setting is per account and re-read when the app regains focus,
 * so desktop and the installed app never keep different settings.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';

interface ReadingGuideProps {
  enabled: boolean;
}

export default function ReadingGuide({ enabled }: ReadingGuideProps) {
  const [position, setPosition] = useState({ y: 0 });
  const uid = useAuthStore((s) => s.currentUser?.id);

  useEffect(() => {
    if (!uid) return;
    const sync = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data } = await supabase.from('profiles').select('reading_guide_enabled,current_theme').eq('user_id', uid).maybeSingle();
      if (!data) return;
      useStore.setState({ readingGuideEnabled: Boolean(data.reading_guide_enabled) });
      const theme = data.current_theme as ReturnType<typeof useStore.getState>['currentTheme'] | null;
      // Apply a theme chosen on another device; skip while onboarding previews own the styles.
      if (theme && theme !== useStore.getState().currentTheme && !location.pathname.startsWith('/onboarding')) {
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'high-contrast', 'inverted');
        root.setAttribute('data-theme', theme);
        if (theme !== 'light') root.classList.add(theme);
        useStore.setState({ currentTheme: theme });
      }
    };
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => { document.removeEventListener('visibilitychange', sync); window.removeEventListener('focus', sync); };
  }, [uid]);

  useEffect(() => {
    if (!enabled) return;
    const move = (e: PointerEvent) => setPosition({ y: e.clientY });
    const touch = (e: TouchEvent) => { const t = e.touches[0]; if (t) setPosition({ y: t.clientY }); };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', move, { passive: true });
    document.addEventListener('touchstart', touch, { passive: true });
    document.addEventListener('touchmove', touch, { passive: true });
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerdown', move);
      document.removeEventListener('touchstart', touch);
      document.removeEventListener('touchmove', touch);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className="reading-guide"
      style={{ top: `${position.y}px` }}
      aria-hidden="true"
    />
  );
}
