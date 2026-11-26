/**
 * Return-to-top control for both roles; appears only after the user scrolls down.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SCROLL_TOP_THRESHOLD = 300;

export default function ScrollToTopButton() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SCROLL_TOP_THRESHOLD);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const main = document.querySelector<HTMLElement>('main, h1');
    main?.focus?.({ preventScroll: true });
  };

  // Onboarding has its own bottom Next/Back controls; the floating button would cover them.
  if (!visible || pathname.startsWith('/onboarding')) return null;

  return (
    <Button
      onClick={goTop}
      className="back-to-top-control fixed right-3 bottom-[calc(var(--mobile-nav-h,4.5rem)+0.75rem)] transition-[bottom] duration-200 z-40 h-12 w-12 min-w-0 rounded-full p-0 opacity-90 shadow-lg md:right-6 md:bottom-6 md:h-auto md:w-auto md:px-4 md:py-3 md:opacity-100"
      aria-label={t('courses.backToTop')}
    >
      <ArrowUp className="h-5 w-5 md:mr-2" aria-hidden="true" />
      <span className="sr-only md:not-sr-only">{t('courses.backToTop')}</span>
    </Button>
  );
}
