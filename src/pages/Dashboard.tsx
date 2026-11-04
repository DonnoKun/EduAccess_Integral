/**
 * EduAccess - Dashboard Page
 * Main hub with analytics, quick actions, and content recommendations
 */


import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import PendingCoursesNotification from '@/components/PendingCoursesNotification';
import PlatformTutorial from '@/components/PlatformTutorial';
import {
  Search,
  BookOpen,
  Settings,
  BarChart3,
  Clock,
  CheckCircle2,
  Target,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Eye,
  Menu,
  Sun,
  Moon,
  Contrast,
  User,
  ChevronDown,
  LogOut,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/integrations/supabase/client';
import { recommendedContentES, recommendedContentEN } from '@/data/mockData';
import LanguageSelector from '@/components/LanguageSelector';
import type { ThemeMode } from '@/types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { 
    visualProfile, 
    hasCompletedOnboarding, 
    sessionMetrics,
    currentTheme,
    setTheme,
    readingGuideEnabled,
    toggleReadingGuide,
    recentSearches,
  } = useStore();
  const { isAuthenticated, logout, currentUser, role } = useAuthStore();
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';

  // Load real aggregate analytics from DB
  const [dbAnalytics, setDbAnalytics] = useState({ totalTime: 0, totalContent: 0, totalTasks: 0, totalCourses: 0 });
  const [showTutorial, setShowTutorial] = useState(false);
  const [teacherStats, setTeacherStats] = useState({ groups: 0, students: 0, published: 0, drafts: 0 });

  useEffect(() => {
    if (role !== 'teacher' || !currentUser?.id) return;
    (async () => {
      const { data: groups } = await supabase.from('groups').select('id').eq('owner_id', currentUser.id);
      const ids = (groups || []).map((g) => g.id);
      if (ids.length === 0) return setTeacherStats({ groups: 0, students: 0, published: 0, drafts: 0 });
      const [{ data: enr }, { data: lessons }] = await Promise.all([
        supabase.from('group_enrollments').select('student_id').in('group_id', ids),
        supabase.from('group_lessons').select('status').in('group_id', ids),
      ]);
      setTeacherStats({
        groups: ids.length,
        students: new Set((enr || []).map((e) => e.student_id)).size,
        published: (lessons || []).filter((l) => l.status === 'published').length,
        drafts: (lessons || []).filter((l) => l.status !== 'published').length,
      });
    })();
  }, [role, currentUser?.id]);

  // Show tutorial automatically ONLY for brand-new users (first time ever).
  // Checks both the browser flag and the DB-persisted flag so returning users
  // never see it again on any device; it can always be reopened with the button.
  useEffect(() => {
    if (!hasCompletedOnboarding || !isAuthenticated || !currentUser?.id) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (localStorage.getItem('tutorial_seen')) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('visual_preferences')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        const prefs = data?.visual_preferences as Record<string, unknown> | null;
        if (prefs?.tutorial_seen) {
          localStorage.setItem('tutorial_seen', 'true');
          return;
        }
      } catch {
        // If the check fails, don't pester possibly-returning users
        return;
      }
      if (!cancelled) setShowTutorial(true);
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [hasCompletedOnboarding, isAuthenticated, currentUser?.id]);
  
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!currentUser?.id) return;
      
      try {
        // Load session analytics
        const { data: sessions } = await supabase
          .from('session_analytics')
          .select('total_time_seconds, content_viewed, tasks_completed')
          .eq('user_id', currentUser.id);
        
        // Load library stats
        const { data: library } = await supabase
          .from('user_library')
          .select('status')
          .eq('user_id', currentUser.id);
        
        if (sessions) {
          const totalTime = sessions.reduce((acc, s) => acc + (s.total_time_seconds || 0), 0);
          const totalContent = sessions.reduce((acc, s) => acc + (s.content_viewed || 0), 0);
          const totalTasks = sessions.reduce((acc, s) => acc + (s.tasks_completed || 0), 0);
          const totalCourses = library?.length || 0;
          setDbAnalytics({ totalTime, totalContent, totalTasks, totalCourses });
        }
      } catch (err) {
        console.error('Analytics load error:', err);
      }
    };
    
    loadAnalytics();
  }, [currentUser?.id]);

  const handleToggleReadingGuide = () => {
    toggleReadingGuide();
    toast.success(!readingGuideEnabled ? t('dashboard.readingGuideEnabled') : t('dashboard.readingGuideDisabled'));
  };

  const handleLogout = () => {
    console.log('🚪 Logging out user from Dashboard...');
    logout();
    toast.success(t('auth.logoutSuccess'));
    // Navigate after a brief delay to allow state cleanup
    setTimeout(() => navigate('/login'), 100);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!hasCompletedOnboarding) {
      navigate('/onboarding');
    }
  }, [isAuthenticated, hasCompletedOnboarding, navigate]);

  if (!visualProfile) return null;

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('themes.light'), icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: t('themes.dark'), icon: <Moon className="h-4 w-4" /> },
    { value: 'high-contrast', label: t('themes.highContrast'), icon: <Contrast className="h-4 w-4" /> },
  ];

  const getContrastLabel = () => {
    switch (visualProfile.preferences.contrast) {
      case 'high':
        return t('dashboard.contrastHigh');
      case 'inverted':
        return t('dashboard.contrastInverted');
      default:
        return t('dashboard.contrastNormal');
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'youtube':
      case 'khan':
        return '📹';
      case 'wikipedia':
      case 'article':
        return '📄';
      case 'openstax':
        return '📚';
      default:
        return '📝';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        {t('common.skipToMain')}
      </a>
      <a href="#main-content" className="skip-link">
        {t('common.skipToMain')}
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="site-header-layout container mx-auto px-4 min-h-16 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('navigation.menu')}>
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold">{t('common.appName')}</span>
            </Link>
          </div>

          <nav className="site-header-nav hidden md:flex flex-wrap items-center gap-4" aria-label="Main navigation">
            {role !== 'teacher' ? (
              <Link 
                to="/search" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('navigation.search')}
              </Link>
            ) : (
              <Link 
                to="/courses" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('navigation.myGroups')}
              </Link>
            )}
            {role !== 'teacher' && (
              <Link to="/courses" className="text-muted-foreground hover:text-foreground transition-colors">
                {t('navigation.courses')}
              </Link>
            )}
            <Link 
              to="/dashboard" 
              className="text-foreground font-medium"
              aria-current="page"
            >
              {t('navigation.dashboard')}
            </Link>
          </nav>

          <div className="site-header-actions flex flex-wrap items-center gap-2">
            <LanguageSelector />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="dashboard-icon-control" aria-label={t('navigation.changeTheme')}>
                  {currentTheme === 'dark' ? (
                    <Moon className="h-4 w-4" />
                  ) : currentTheme === 'high-contrast' ? (
                    <Contrast className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-background border"
                style={{ fontSize: visualProfile?.preferences?.fontSize || '16px' }}
              >
                {themeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className="flex items-center gap-2"
                    style={{ fontSize: '1em', padding: '0.75em 1em' }}
                  >
                    <span style={{ width: '1.25em', height: '1.25em', display: 'flex', alignItems: 'center' }}>
                      {option.icon}
                    </span>
                    <span>{option.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={readingGuideEnabled ? 'default' : 'ghost'} 
                  size="icon" 
                  className="dashboard-icon-control"
                  onClick={handleToggleReadingGuide}
                  aria-label={t('dashboard.toggleReadingGuide')}
                  aria-pressed={readingGuideEnabled}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard.readingGuideTooltip')}</p>
              </TooltipContent>
            </Tooltip>

            {/* User Menu with Logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="dashboard-user-control flex items-center gap-2 px-3">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline max-w-[120px] truncate">
                    {visualProfile?.userName || currentUser?.name || t('navigation.user')}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-background border"
                style={{ 
                  fontSize: visualProfile?.preferences?.fontSize || '16px',
                  minWidth: 'max-content',
                  width: 'auto',
                }}
              >
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard')} 
                  className="flex items-center gap-2"
                  style={{ fontSize: '1em', padding: '0.75em 1.25em', whiteSpace: 'nowrap' }}
                >
                  <Sparkles style={{ width: '1.25em', height: '1.25em', flexShrink: 0 }} />
                  <span>{t('navigation.dashboard')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate('/settings')} 
                  className="flex items-center gap-2"
                  style={{ fontSize: '1em', padding: '0.75em 1.25em', whiteSpace: 'nowrap' }}
                >
                  <Settings style={{ width: '1.25em', height: '1.25em', flexShrink: 0 }} />
                  <span>{t('navigation.settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                  style={{ fontSize: '1em', padding: '0.75em 1.25em', whiteSpace: 'nowrap' }}
                >
                  <LogOut style={{ width: '1.25em', height: '1.25em', flexShrink: 0 }} />
                  <span>{t('common.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Welcome Card */}
          <motion.div variants={item}>
            <Card className="glass-card border-primary/20">
              <CardContent className="p-6">
                <div className="dashboard-welcome-layout">
                  <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">
                      {t('dashboard.welcome', { name: visualProfile.userName })}
                    </h1>
                    <p className="text-muted-foreground">
                      {t('dashboard.profileInfo', {
                        snellen: visualProfile.visualAcuity.snellen,
                        contrast: getContrastLabel(),
                        fontSize: visualProfile.preferences.fontSize,
                      })}
                    </p>
                  </div>
                  <div className="dashboard-quick-actions">
                    {role !== 'teacher' && (
                      <>
                        <Button onClick={() => navigate('/search')} className="touch-target">
                          <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                          {t('dashboard.quickActions.search')}
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/library')} className="touch-target">
                          <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                          {t('dashboard.quickActions.library')}
                        </Button>
                      </>
                    )}
                    <Button variant="outline" onClick={() => navigate('/courses')} className="touch-target">
                      <GraduationCap className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t(role === 'teacher' ? 'navigation.myGroups' : 'navigation.courses')}

                    </Button>
                    <Button variant="outline" onClick={() => navigate('/settings')} className="touch-target">
                      <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('dashboard.quickActions.settings')}
                    </Button>
                    <Button variant="outline" onClick={() => setShowTutorial(true)} className="touch-target">
                      <HelpCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                      {lang === 'es' ? 'Tutorial' : 'Tutorial'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>


          {/* Pending Courses Notification */}
          <motion.div variants={item}>
            <PendingCoursesNotification />
          </motion.div>

          {role === 'teacher' ? (
            <>
          {/* Teacher summary */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
                  {t('courses.teacherSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />, value: teacherStats.groups, label: t('courses.statGroups') },
                    { icon: <User className="h-6 w-6 text-primary" aria-hidden="true" />, value: teacherStats.students, label: t('courses.statStudents') },
                    { icon: <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />, value: teacherStats.published, label: t('courses.statLessons') },
                    { icon: <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />, value: teacherStats.drafts, label: t('courses.statDrafts') },
                  ].map((st) => (
                    <div key={st.label} className="p-4 rounded-lg bg-secondary/50 text-center">
                      <div className="flex items-center justify-center mb-2">{st.icon}</div>
                      <p className="text-2xl font-bold">{st.value}</p>
                      <p className="text-sm text-muted-foreground break-words">{st.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Teacher tips (actionable) */}
          <motion.div variants={item}>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                  {t('courses.teacherTipsTitle')}
                </h3>
                <ul className="space-y-2">
                  {['teacherTip1', 'teacherTip2', 'teacherTip3', 'teacherTip4'].map((k) => (
                    <li key={k}>
                      <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal text-left" onClick={async () => {
                        if (k === 'teacherTip1') return navigate('/courses?create=1');
                        const { data } = await supabase.from('groups').select('id').eq('owner_id', currentUser?.id || '').order('created_at').limit(1);
                        const gid = data?.[0]?.id;
                        if (!gid) return navigate('/courses?create=1');
                        navigate(`/courses/${gid}?tab=${k === 'teacherTip3' ? 'lessons' : 'students'}`);
                      }}>
                        <GraduationCap className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="break-words">{t(`courses.${k}`)}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
            </>
          ) : (
            <>
          {/* Quick Stats & Recent Activity */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Searches */}
            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
                    {t('dashboard.recentSearches')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentSearches.length === 0 ? (
                    <div className="text-center py-6">
                      <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {lang === 'es' ? 'Aún no has realizado búsquedas' : 'No searches yet'}
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate('/search')}
                        className="mt-2"
                      >
                        {lang === 'es' ? 'Ir a buscar' : 'Start searching'}
                      </Button>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {recentSearches.slice(0, 5).map((search, index) => (
                        <li key={index}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-left"
                            onClick={() => navigate(`/search?q=${encodeURIComponent(search)}`)}
                          >
                            <Search className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            {search}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recommended Content - Dynamic based on search history */}
            <motion.div variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
                    {t('dashboard.recommendedContent')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(() => {
                      const staticRecs = lang === 'es' ? recommendedContentES : recommendedContentEN;
                      // Build dynamic recommendations from recent searches
                      if (recentSearches.length > 0) {
                        // Use recent searches as recommendations, then fill with static
                        const dynamicRecs = recentSearches.slice(0, 3).map((search, i) => ({
                          id: `dynamic-${i}`,
                          title: search,
                          source: 'search' as string,
                          query: search,
                        }));
                        // Fill remaining slots with static recs not already covered
                        const remaining = staticRecs.filter(
                          (sr) => !recentSearches.some((rs) => rs.toLowerCase().includes(sr.query.split(' ')[0].toLowerCase()))
                        ).slice(0, 5 - dynamicRecs.length);
                        return [...dynamicRecs, ...remaining];
                      }
                      return staticRecs;
                    })().map((content) => (
                      <li key={content.id}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => navigate(`/search?q=${encodeURIComponent(content.query)}`)}
                        >
                          <span className="mr-2" aria-hidden="true">
                            {getSourceIcon(content.source)}
                          </span>
                          <span className="truncate">{content.title}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Session Analytics */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
                  {t('dashboard.sessionAnalytics')}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    {t('dashboard.forResearch')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">{dbAnalytics.totalContent + sessionMetrics.contentViewed}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.contentViewed')}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">
                      {Math.floor((dbAnalytics.totalTime + sessionMetrics.totalTimeSpent) / 60)}m
                    </p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.timeSpent')}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">{dbAnalytics.totalTasks + sessionMetrics.tasksCompleted}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.tasksCompleted')}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Target className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-2xl font-bold">{dbAnalytics.totalCourses}</p>
                    <p className="text-sm text-muted-foreground">
                      {lang === 'es' ? 'Cursos guardados' : 'Saved courses'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Tips */}
          <motion.div variants={item}>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                  {t('dashboard.quickTips')}
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t('dashboard.tip1')}</li>
                  <li>• {t('dashboard.tip2')}</li>
                  <li>• {t('dashboard.tip3')}</li>
                  <li>• {t('dashboard.tip4')}</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
            </>
          )}
        </motion.div>
      </main>

      {/* Platform Tutorial Dialog */}
      <PlatformTutorial open={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}
