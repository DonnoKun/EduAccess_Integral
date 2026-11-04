/**
 * EduAccess - Library Page
 * Shows saved and completed courses from database with progress tracking
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  Sparkles,
  Search,
  Sun,
  Moon,
  Contrast,
  Eye,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useLibrarySync } from '@/hooks/useLibrarySync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LanguageSelector from '@/components/LanguageSelector';
import type { ThemeMode } from '@/types';

interface LibraryItemWithProgress {
  id: string;
  contentData: any;
  status: string;
  progressPercentage: number;
  exercisesCompleted: number;
  exercisesTotal: number;
  timeSpentSeconds: number;
  updatedAt: string;
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const {
    selectContent,
    visualProfile,
    currentTheme,
    setTheme,
    readingGuideEnabled,
    toggleReadingGuide,
  } = useStore();
  const { currentUser, logout } = useAuthStore();
  useLibrarySync(); // Keeps library in sync
  const lang = i18n.language?.split('-')[0] || 'es';

  const [libraryItems, setLibraryItems] = useState<LibraryItemWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load library from DB with progress data
  useEffect(() => {
    const loadLibrary = async () => {
      if (!currentUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_library')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error loading library:', error);
        } else if (data) {
          const items: LibraryItemWithProgress[] = data.map((item: any) => ({
            id: item.id,
            contentData: item.content_data,
            status: item.status,
            progressPercentage: item.progress_percentage || 0,
            exercisesCompleted: item.exercises_completed || 0,
            exercisesTotal: item.exercises_total || 0,
            timeSpentSeconds: item.time_spent_seconds || 0,
            updatedAt: item.updated_at,
          }));
          setLibraryItems(items);
        }
      } catch (err) {
        console.error('Library load error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLibrary();
  }, [currentUser?.id]);

  const handleLogout = () => {
    logout();
    toast.success(t('auth.logoutSuccess'));
    setTimeout(() => navigate('/login'), 100);
  };

  const handleContentClick = (item: LibraryItemWithProgress) => {
    const content = item.contentData;
    if (content) {
      selectContent({
        id: content.id || item.id,
        title: content.title || '',
        description: content.description || '',
        contentType: content.contentType || 'article',
        source: content.source || 'wikipedia',
        url: content.url || '',
        accessibilityStatus: content.accessibilityStatus || 'accessible',
        educationLevel: content.educationLevel || 'intermediate',
        metadata: content.metadata || { tags: [], language: 'es' },
        thumbnail: content.thumbnail || '',
      });
      navigate(`/content/${content.id || item.id}`);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const savedItems = libraryItems.filter((i) => i.status === 'saved');
  const completedItems = libraryItems.filter((i) => i.status === 'completed');

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('themes.light'), icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: t('themes.dark'), icon: <Moon className="h-4 w-4" /> },
    { value: 'high-contrast', label: t('themes.highContrast'), icon: <Contrast className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold hidden md:inline">{t('common.appName')}</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <Link to="/search" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('navigation.search')}
            </Link>
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('navigation.dashboard')}
            </Link>
            <Link to="/library" className="text-foreground font-medium" aria-current="page">
              {lang === 'es' ? 'Biblioteca' : 'Library'}
            </Link>
            <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('navigation.settings')}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="dashboard-icon-control" aria-label={t('navigation.changeTheme')}>
                  {currentTheme === 'dark' ? <Moon className="h-4 w-4" /> : currentTheme === 'high-contrast' ? <Contrast className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border">
                {themeOptions.map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)} className="flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={readingGuideEnabled ? 'default' : 'ghost'}
              size="icon"
              onClick={() => toggleReadingGuide()}
              className="dashboard-icon-control"
              aria-label={lang === 'es' ? 'Guía de lectura' : 'Reading guide'}
            >
              <Eye className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline max-w-[120px] truncate">
                    {visualProfile?.userName || currentUser?.name || t('navigation.user')}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border">
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t('navigation.dashboard')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('navigation.settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  {t('common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              {lang === 'es' ? 'Mi Biblioteca' : 'My Library'}
            </h1>
            <Button onClick={() => navigate('/search')} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              {lang === 'es' ? 'Buscar más contenido' : 'Search more content'}
            </Button>
          </div>

          {/* Stats Summary */}
          {libraryItems.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <BookmarkCheck className="h-6 w-6 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{savedItems.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'es' ? 'En progreso' : 'In progress'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{completedItems.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'es' ? 'Completados' : 'Completed'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold">
                    {formatTime(libraryItems.reduce((acc, i) => acc + i.timeSpentSeconds, 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'es' ? 'Tiempo total' : 'Total time'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-12">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
              <p className="text-muted-foreground">{lang === 'es' ? 'Cargando biblioteca...' : 'Loading library...'}</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && libraryItems.length === 0 && (
            <Card>
              <CardContent className="text-center py-16">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium mb-2">
                  {lang === 'es' ? 'Tu biblioteca está vacía' : 'Your library is empty'}
                </p>
                <p className="text-muted-foreground mb-6">
                  {lang === 'es'
                    ? 'Busca un tema, genera un curso y guárdalo para verlo aquí.'
                    : 'Search a topic, generate a course and save it to see it here.'}
                </p>
                <Button onClick={() => navigate('/search')} size="lg">
                  <Search className="h-5 w-5 mr-2" />
                  {lang === 'es' ? 'Explorar contenido' : 'Explore content'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* In Progress Courses */}
          {savedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookmarkCheck className="h-5 w-5 text-primary" />
                  {lang === 'es' ? 'En Progreso' : 'In Progress'}
                  <span className="text-sm font-normal text-muted-foreground">({savedItems.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedItems.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleContentClick(item)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">
                          {item.contentData?.title || (lang === 'es' ? 'Sin título' : 'Untitled')}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          {item.contentData?.source
                            ? item.contentData.source.charAt(0).toUpperCase() + item.contentData.source.slice(1)
                            : ''}
                        </p>
                        {/* Progress bar */}
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{lang === 'es' ? 'Progreso' : 'Progress'}</span>
                            <span>{item.progressPercentage}%</span>
                          </div>
                          <Progress value={item.progressPercentage} className="h-2" />
                        </div>
                        {/* Exercise progress */}
                        {item.exercisesTotal > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {lang === 'es' ? 'Ejercicios' : 'Exercises'}: {item.exercisesCompleted}/{item.exercisesTotal}
                          </p>
                        )}
                        {item.timeSpentSeconds > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(item.timeSpentSeconds)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Courses */}
          {completedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  {lang === 'es' ? 'Cursos Completados' : 'Completed Courses'}
                  <span className="text-sm font-normal text-muted-foreground">({completedItems.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedItems.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-emerald-500/20"
                      onClick={() => handleContentClick(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold line-clamp-2 flex-1">
                            {item.contentData?.title || ''}
                          </h3>
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 ml-2" />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {item.contentData?.source
                            ? item.contentData.source.charAt(0).toUpperCase() + item.contentData.source.slice(1)
                            : ''}
                        </p>
                        <Progress value={100} className="h-2 mb-2" />
                        {item.exercisesTotal > 0 && (
                          <p className="text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {item.exercisesCompleted}/{item.exercisesTotal} {lang === 'es' ? 'ejercicios' : 'exercises'}
                          </p>
                        )}
                        {item.timeSpentSeconds > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(item.timeSpentSeconds)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}
