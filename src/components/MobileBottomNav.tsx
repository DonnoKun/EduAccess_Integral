/**
 * EduAccess - Mobile Bottom Navigation
 * Responsive bottom nav bar for mobile devices
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, LayoutDashboard, BookOpen, Settings, GraduationCap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthStore } from '@/store/useAuthStore';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
}

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { role } = useAuthStore();
  const navRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  // Like the header: hide while scrolling down so content keeps the screen, show again on scroll up.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80 || y < last - 4) setHidden(false);
      else if (y > last + 4) setHidden(true);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { setHidden(false); }, [location.pathname]);

  // Publish the visible bar height so floating controls (back to top) always sit above it.
  useEffect(() => {
    const root = document.documentElement;
    const el = navRef.current;
    const apply = () => root.style.setProperty('--mobile-nav-h', !el || hidden ? '0px' : `${el.offsetHeight}px`);
    apply();
    const ro = el ? new ResizeObserver(apply) : null;
    if (el) ro!.observe(el);
    return () => { ro?.disconnect(); root.style.setProperty('--mobile-nav-h', '0px'); };
  }, [hidden, isMobile, location.pathname]);

  if (!isMobile) return null;

  const isTeacher = role === 'teacher';

  const navItems: NavItem[] = [
    { path: '/dashboard', labelKey: 'navigation.dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    ...(isTeacher
      ? []
      : [{ path: '/search', labelKey: 'navigation.search', icon: <Search className="h-5 w-5" /> }]),
    {
      path: '/courses',
      labelKey: isTeacher ? 'navigation.myGroups' : 'navigation.courses',
      icon: <GraduationCap className="h-5 w-5" />,
    },
    ...(isTeacher
      ? []
      : [{ path: '/library', labelKey: 'navigation.library', icon: <BookOpen className="h-5 w-5" /> }]),
    { path: '/settings', labelKey: 'navigation.settings', icon: <Settings className="h-5 w-5" /> },
  ];


  const isActive = (path: string) => location.pathname === path;
  // Profile setup has its own Back/Next controls at the bottom; the bar would cover them.
  if (location.pathname.startsWith('/onboarding')) return null;

  return (
    <nav 
      ref={navRef}
      className={`fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md transition-transform duration-200 md:hidden ${hidden ? 'translate-y-full' : 'translate-y-0'}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label={t('navigation.main', 'Main navigation')}
    >
      <div className="flex items-stretch justify-around gap-1 px-1 min-h-14">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors touch-target ${
              isActive(item.path) 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-current={isActive(item.path) ? 'page' : undefined}
          >
            {item.icon}
            <span className="mobile-nav-label w-full text-center font-medium">
              {t(`${item.labelKey}Short`, { defaultValue: t(item.labelKey) })}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
