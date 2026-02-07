/**
 * EduAccess - Library Page
 * Shows saved and completed courses from user's session
 */

import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  Sparkles,
  Search,
  ArrowLeft,
  Sun,
  Moon,
  Contrast,
  Eye,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Library as LibraryIcon,
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
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import LanguageSelector from '@/components/LanguageSelector';
import type { ThemeMode } from '@/types';

export default function LibraryPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const {
    savedContent,
    completedContent,
    selectContent,
    visualProfile,
    currentTheme,
    setTheme,
    readingGuideEnabled,
    toggleReadingGuide,
  } = useStore();
  const { currentUser, logout } = useAuthStore();
  const lang = i18n.language?.split('-')[0] || 'es';

  const handleLogout = () => {
    logout();
    toast.success(t('auth.logoutSuccess'));
    setTimeout(() => navigate('/login'), 100);
  };

  const handleContentClick = (content: any) => {
    selectContent(content);
    navigate(`/content/${content.id}`);
  };

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
                <Button variant="outline" size="icon" aria-label={t('navigation.changeTheme')}>
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

          {/* Saved Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookmarkCheck className="h-5 w-5 text-primary" />
                {lang === 'es' ? 'Contenido Guardado' : 'Saved Content'}
                <span className="text-sm font-normal text-muted-foreground">
                  ({savedContent.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedContent.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {lang === 'es' ? 'No tienes contenido guardado' : 'No saved content yet'}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    {lang === 'es'
                      ? 'Cuando guardes un curso, aparecerá aquí para que puedas acceder fácilmente.'
                      : 'When you save a course, it will appear here for easy access.'}
                  </p>
                  <Button onClick={() => navigate('/search')}>
                    <Search className="h-4 w-4 mr-2" />
                    {lang === 'es' ? 'Explorar contenido' : 'Explore content'}
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedContent.map((content) => (
                    <Card
                      key={content.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleContentClick(content)}
                    >
                      <CardContent className="p-4">
                        {content.thumbnail && (
                          <div className="relative overflow-hidden rounded-lg bg-muted h-32 mb-3">
                            <img
                              src={content.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <h3 className="font-semibold mb-1 line-clamp-2">{content.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {content.source.charAt(0).toUpperCase() + content.source.slice(1)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {lang === 'es' ? 'Cursos Completados' : 'Completed Courses'}
                <span className="text-sm font-normal text-muted-foreground">
                  ({completedContent.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedContent.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {lang === 'es' ? 'No has completado ningún curso' : 'No completed courses yet'}
                  </p>
                  <p className="text-muted-foreground">
                    {lang === 'es'
                      ? 'Cuando marques un curso como completado, aparecerá aquí.'
                      : 'When you mark a course as completed, it will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedContent.map((content) => (
                    <Card
                      key={content.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-primary/20"
                      onClick={() => handleContentClick(content)}
                    >
                      <CardContent className="p-4">
                        {content.thumbnail && (
                          <div className="relative overflow-hidden rounded-lg bg-muted h-32 mb-3">
                            <img
                              src={content.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                        <h3 className="font-semibold mb-1 line-clamp-2">{content.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {content.source.charAt(0).toUpperCase() + content.source.slice(1)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
