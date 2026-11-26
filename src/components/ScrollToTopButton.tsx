/**
 * Return-to-top control for both roles; appears only after the user scrolls down.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SCROLL_TOP_THRESHOLD = 300;

export default function ScrollToTopButton() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

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

  if (!visible) return null;

  return (
    <Button
      onClick={goTop}
      className="back-to-top-control fixed bottom-24 left-1/2 -translate-x-1/2 z-50 md:left-auto md:right-6 md:translate-x-0 h-auto rounded-full px-4 py-3 shadow-lg md:bottom-6"
      aria-label={t('courses.backToTop')}
    >
      <ArrowUp className="mr-2 h-5 w-5" aria-hidden="true" />
      {t('courses.backToTop')}
    </Button>
  );
}
