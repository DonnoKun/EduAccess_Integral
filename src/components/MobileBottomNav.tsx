/**
 * EduAccess - Mobile Bottom Navigation
 * Responsive bottom nav bar for mobile devices
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, LayoutDashboard, BookOpen, Settings, GraduationCap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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

  if (!isMobile) return null;

  const navItems: NavItem[] = [
    { path: '/dashboard', labelKey: 'navigation.dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: '/search', labelKey: 'navigation.search', icon: <Search className="h-5 w-5" /> },
    { path: '/library', labelKey: 'navigation.library', icon: <BookOpen className="h-5 w-5" /> },
    { path: '/settings', labelKey: 'navigation.settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label={t('navigation.main', 'Main navigation')}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors touch-target ${
              isActive(item.path) 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-current={isActive(item.path) ? 'page' : undefined}
          >
            {item.icon}
            <span className="text-[10px] font-medium leading-none">
              {t(item.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
