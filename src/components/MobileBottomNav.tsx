/**
 * EduAccess - Mobile Bottom Navigation
 * Responsive bottom nav bar for mobile devices
 */

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

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label={t('navigation.main', 'Main navigation')}
    >
      <div className="flex items-stretch justify-around min-h-16">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 px-0.5 py-1.5 transition-colors touch-target ${
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
