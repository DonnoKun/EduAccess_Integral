/**
 * EduAccess - Search Page
 * Educational content discovery with filters and accessibility badges
 */

import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon,
  Filter,
  Grid3X3,
  List,
  Mic,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Sun,
  Moon,
  Contrast,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import LanguageSelector from '@/components/LanguageSelector';
import type { ContentType, EducationLevel, AccessibilityStatus, ThemeMode } from '@/types';

export default function SearchPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    searchQuery,
    searchResults,
    searchLoading,
    searchFilters,
    searchSuggestions,
    searchNoResultsReason,
    performSearch,
    setSearchFilters,
    clearFilters,
    selectContent,
    hasCompletedOnboarding,
    currentTheme,
    setTheme,
    readingGuideEnabled,
    toggleReadingGuide,
    visualProfile,
  } = useStore();
  const { isAuthenticated, logout, currentUser } = useAuthStore();

  const [localQuery, setLocalQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isListening, setIsListening] = useState(false);

  const applyTranscript = (transcript: string) => {
    const f = useStore.getState().searchFilters;
    if (!f.educationLevel?.length || !f.contentType?.length) {
      setLocalQuery(transcript);
      toast.error(lang === 'es' ? 'Elige el nivel y el tipo de contenido antes de buscar.' : 'Choose a level and content type before searching.');
      return;
    }
    autoOpen.current = true;
    setLocalQuery(transcript);
    setSearchParams({ q: transcript });
    performSearch(transcript);
  };

  // Fallback for browsers whose built-in recognizer fails (Brave, Opera, Firefox...):
  // record a short clip and transcribe it on the backend.
  const recordAndTranscribe = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error(lang === 'es' ? 'Tu navegador no soporta búsqueda por voz' : 'Voice search not supported');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(lang === 'es' ? 'Permiso de micrófono denegado. Actívalo en la configuración del navegador.' : 'Microphone permission denied.');
      return;
    }
    const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    setIsListening(true);
    toast.info(lang === 'es' ? '🎤 Habla ahora (5 segundos)...' : '🎤 Speak now (5 seconds)...');
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || mime });
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        const format = (recorder.mimeType || mime).includes('mp4') ? 'mp4' : (recorder.mimeType || mime).includes('ogg') ? 'ogg' : 'webm';
        const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: { audio: btoa(bin), format, lang } });
        const text = (data as any)?.text?.trim();
        if (error || !text) {
          toast.error(lang === 'es' ? 'No se entendió la voz. Intenta de nuevo.' : 'Could not understand. Try again.');
        } else applyTranscript(text);
      } catch {
        toast.error(lang === 'es' ? 'No se pudo procesar la voz.' : 'Could not process voice.');
      } finally {
        setIsListening(false);
      }
    };
    recorder.start();
    setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), 5000);
  };

  const handleVoiceSearch = () => {
    if (isListening) return;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const isBrave = !!(navigator as any).brave;
    if (!SpeechRecognitionAPI || isBrave) {
      recordAndTranscribe();
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang === 'es' ? 'es-ES' : 'en-US';
    recognition.interimResults = false;
    setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      applyTranscript(transcript);
    };
    recognition.onerror = (event: any) => {
      let msg = '';
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          msg = lang === 'es' ? 'Permiso de micrófono denegado. Actívalo en la configuración del navegador.' : 'Microphone permission denied.';
          break;
        case 'no-speech':
          msg = lang === 'es' ? 'No se detectó voz. Intenta de nuevo.' : 'No speech detected.';
          break;
        case 'network':
        case 'language-not-supported':
          setIsListening(false);
          recordAndTranscribe();
          return;
        case 'aborted':
          msg = lang === 'es' ? 'Reconocimiento de voz cancelado.' : 'Voice recognition cancelled.';
          break;
        default:
          msg = lang === 'es' ? `Error en reconocimiento de voz: ${event.error || 'desconocido'}` : `Voice recognition error: ${event.error || 'unknown'}`;
      }
      toast.error(msg);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    toast.info(lang === 'es' ? '🎤 Habla ahora...' : '🎤 Speak now...');
  };

  const contentTypeLabels: Record<ContentType, string> = {
    video: t('search.contentTypes.video'),
    article: t('search.contentTypes.article'),
    textbook: t('search.contentTypes.textbook'),
    exercise: t('search.contentTypes.exercise'),
    diagram: t('search.contentTypes.diagram'),
  };

  const educationLevelLabels: Record<EducationLevel, string> = {
    elementary: t('search.educationLevels.elementary'),
    middle: t('search.educationLevels.middle'),
    high: t('search.educationLevels.high'),
    college: t('search.educationLevels.college'),
  };

  // ProtectedRoute already handles auth/onboarding redirects
  // This effect only handles search execution
  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam) {
      setLocalQuery(queryParam);
      if (useStore.getState().searchQuery !== queryParam || !useStore.getState().searchResults.length) performSearch(queryParam);
    }
  }, [searchParams, performSearch]);

  // A submitted query opens one lesson directly; the list stays only for returning users.
  const autoOpen = useRef(false);
  useEffect(() => {
    if (!autoOpen.current || searchLoading) return;
    if (searchResults.length) { autoOpen.current = false; handleContentClick(searchResults[0].id); }
    else if (searchQuery) autoOpen.current = false;
  }, [searchResults, searchLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim() && (!searchFilters.educationLevel?.length || !searchFilters.contentType?.length)) {
      toast.error(lang === 'es' ? 'Elige el nivel y el tipo de contenido antes de buscar.' : 'Choose a level and content type before searching.');
      return;
    }
    autoOpen.current = Boolean(localQuery.trim());
    setSearchParams(localQuery ? { q: localQuery } : {});
    // Re-submitting the same text (e.g. after changing level/type) must search again.
    if (localQuery.trim() && localQuery === searchParams.get('q')) performSearch(localQuery);
  };

  const handleLogout = async () => {
    console.log('🚪 Logging out user from Search...');
    await logout();
    toast.success(t('auth.logoutSuccess'));
  };

  const handleContentClick = (contentId: string) => {
    const content = searchResults.find((r) => r.id === contentId);
    if (content) {
      selectContent({ ...content, contentType: searchFilters.contentType?.[0] || content.contentType, educationLevel: searchFilters.educationLevel?.[0] || content.educationLevel });
      const navState = { fromSearch: true, searchQuery: localQuery };
      // Every lesson is generated already adapted, so all results open in the same reader.
      navigate(`/content/${contentId}`, { state: navState });
    }
  };

  const handleFilterChange = (
    type: 'contentType' | 'educationLevel' | 'accessibilityStatus',
    value: string,
    checked: boolean
  ) => {
    const currentValues = (searchFilters[type] as string[]) || [];
    const newValues = checked
      ? (type === 'accessibilityStatus' ? [...currentValues, value] : [value])
      : currentValues.filter((v) => v !== value);
    
    setSearchFilters({
      ...searchFilters,
      [type]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchFilters.contentType?.length) count += searchFilters.contentType.length;
    if (searchFilters.educationLevel?.length) count += searchFilters.educationLevel.length;
    if (searchFilters.accessibilityStatus?.length) count += searchFilters.accessibilityStatus.length;
    return count;
  }, [searchFilters]);

  const currentFontSize = parseInt(String(visualProfile?.preferences?.fontSize || '16'));
  const getAccessibilityBadge = (status: AccessibilityStatus, _isListView = false) => {
    const configs = {
      accessible: { icon: CheckCircle2, label: t('search.badges.accessible'), className: 'badge-accessible' },
      needs_remediation: { icon: AlertCircle, label: t('search.badges.needsRemediation'), className: 'badge-needs-remediation' },
      partially_accessible: { icon: AlertTriangle, label: t('search.badges.partial'), className: 'badge-partial' },
    };
    const config = configs[status];
    const Icon = config.icon;
    return (
      <TooltipProvider><Tooltip>
        <TooltipTrigger asChild>
          <div className={`search-status ${config.className}`} role="status" tabIndex={0}>
            <Icon aria-hidden="true" /><span>{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent><p>{config.label}</p></TooltipContent>
      </Tooltip></TooltipProvider>
    );
  };

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('themes.light'), icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: t('themes.dark'), icon: <Moon className="h-4 w-4" /> },
    { value: 'high-contrast', label: t('themes.highContrast'), icon: <Contrast className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <a href="#search-results" className="skip-link">{t('common.skipToMain')}</a>

      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="site-header-layout search-header-layout container mx-auto px-4 min-h-16 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold hidden md:inline">{t('search.title')}</span>
          </Link>

          <div className="site-header-actions flex flex-wrap items-center gap-2">
            <LanguageSelector />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="dashboard-icon-control" aria-label={t('navigation.changeTheme')}>
                  {currentTheme === 'dark' ? <Moon className="h-4 w-4" /> : currentTheme === 'high-contrast' ? <Contrast className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-background border"
                style={{ fontSize: `${currentFontSize}px` }}
              >
                {themeOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.value} 
                    onClick={() => setTheme(option.value)} 
                    className="flex items-center gap-3 cursor-pointer"
                    style={{ fontSize: '1em', padding: '0.75em 1em' }}
                  >
                    <span style={{ width: '1.25em', height: '1.25em', display: 'flex', alignItems: 'center' }}>
                      {option.icon}
                    </span>
                    <span className="flex-1">{option.label}</span>
                    {currentTheme === option.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant={readingGuideEnabled ? 'default' : 'ghost'} 
              size="icon" 
              className="dashboard-icon-control"
              onClick={() => {
                toggleReadingGuide();
                toast.success(!readingGuideEnabled ? t('dashboard.readingGuideEnabled') : t('dashboard.readingGuideDisabled'));
              }}
              aria-label={t('dashboard.toggleReadingGuide')}
              aria-pressed={readingGuideEnabled}
            >
              <Eye className="h-4 w-4" />
            </Button>

            {/* User Menu with Logout */}
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
              <DropdownMenuContent 
                align="end" 
                className="bg-background border"
                style={{ 
                  fontSize: `${currentFontSize}px`,
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

      <main className="container mx-auto px-4 py-6">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="search-field relative min-w-0 flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Input type="text" placeholder={t('search.placeholder')} value={localQuery} onChange={(e) => setLocalQuery(e.target.value)} className="search-query-input" aria-label={t('search.placeholder')} />
              {localQuery && (
                <button type="button" onClick={() => { setLocalQuery(''); setSearchParams({}); performSearch(''); }} className="search-clear absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={t('search.clearSearch')}>
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <Button 
              type="button" 
              variant={isListening ? 'default' : 'outline'} 
              size="icon" 
              className={`h-12 w-12 ${isListening ? 'animate-pulse' : ''}`} 
              aria-label={t('search.voiceSearch')}
              onClick={handleVoiceSearch}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button type="submit" className="h-12 px-6">{t('search.searchButton')}</Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9">
                  <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                  {t('search.filters.contentType')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border">
                <DropdownMenuLabel>{t('search.filters.filterByType')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(contentTypeLabels) as [ContentType, string][]).filter(([type]) => type !== 'video').map(([type, label]) => (
                  <DropdownMenuCheckboxItem key={type} checked={searchFilters.contentType?.includes(type)} onCheckedChange={(checked) => handleFilterChange('contentType', type, checked)}>
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9">{t('search.filters.level')}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border">
                <DropdownMenuLabel>{t('search.filters.educationLevel')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(educationLevelLabels) as [EducationLevel, string][]).map(([level, label]) => (
                  <DropdownMenuCheckboxItem key={level} checked={searchFilters.educationLevel?.includes(level)} onCheckedChange={(checked) => handleFilterChange('educationLevel', level, checked)}>
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

{activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t('search.filters.clearFilters')} ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('search.results', { count: searchResults.length })}</span>
            <div className="flex border rounded-lg">
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} aria-label={t('search.gridView')} aria-pressed={viewMode === 'grid'}>
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} aria-label={t('search.listView')} aria-pressed={viewMode === 'list'}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <section id="search-results" aria-label="Search results" aria-busy={searchLoading}>
          {searchLoading ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'search-card-grid' : ''}`}>
              {[...Array(6)].map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full mb-4" /><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 max-w-lg mx-auto">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-semibold mb-2">{t('search.noResults')}</h2>
              <p className="text-muted-foreground mb-6">
                {searchNoResultsReason || t('search.noResultsHint')}
              </p>
              
              {/* Show AI-generated search suggestions */}
              {searchSuggestions && searchSuggestions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    {t('search.suggestionsTitle')}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {searchSuggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          setLocalQuery(suggestion);
                          setSearchParams({ q: suggestion });
                          performSearch(suggestion);
                        }}
                      >
                        <SearchIcon className="h-3 w-3 mr-1.5" aria-hidden="true" />
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div 
                key={viewMode} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className={`grid gap-4 ${viewMode === 'grid' ? 'search-card-grid' : ''}`}
              >
                {searchResults.map((result, index) => (
                  <motion.div key={result.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Card 
                      className="h-full hover:shadow-lg transition-shadow cursor-pointer group" 
                      onClick={() => handleContentClick(result.id)} 
                      role="article" 
                      tabIndex={0} 
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleContentClick(result.id); } }}
                    >
                      <CardContent className={`p-4 ${viewMode === 'list' ? 'flex flex-wrap gap-4' : ''}`} style={{ overflow: 'hidden' }}>
                        {/* GRID VIEW: Thumbnail + Badge below */}
                        {viewMode === 'grid' && (
                          <>
                            <div className="relative overflow-hidden rounded-lg bg-muted h-40 mb-3">
                              {result.thumbnail ? (
                                <img src={result.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">{contentTypeLabels[result.contentType]?.split(' ')[0]}</div>
                              )}
                            </div>
                            <div className="mb-3" style={{ maxWidth: '100%', overflow: 'hidden' }}>{getAccessibilityBadge(result.accessibilityStatus)}</div>
                          </>
                        )}
                        
                        {/* LIST VIEW: Thumbnail without badge */}
                        {viewMode === 'list' && (
                          <div className="relative overflow-hidden search-list-thumb rounded-lg bg-muted flex-shrink-0">
                            {result.thumbnail ? (
                              <img src={result.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">{contentTypeLabels[result.contentType]?.split(' ')[0]}</div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          {/* LIST VIEW: Title + Badge in same row */}
                          {viewMode === 'list' && (
                            <div className="flex flex-wrap items-start gap-3 mb-2">
                              <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors flex-1 min-w-[150px]">
                                {result.title}
                              </h3>
                              {getAccessibilityBadge(result.accessibilityStatus, true)}
                            </div>
                          )}
                          
                          {/* GRID VIEW: Title only */}
                          {viewMode === 'grid' && (
                            <h3 className="font-semibold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                              {result.title}
                            </h3>
                          )}
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {result.source.charAt(0).toUpperCase() + result.source.slice(1)}
                            {result.metadata.duration && ` · ${result.metadata.duration}`}
                            {result.metadata.wordCount && ` · ${result.metadata.wordCount.toLocaleString()} words`}
                          </p>
                          <p className={`text-sm text-muted-foreground ${viewMode === 'list' ? '' : 'line-clamp-2'}`}>{result.description}</p>
                          {result.accessibilityIssues && result.accessibilityIssues.length > 0 && (
                            <p className="text-xs text-warning mt-2">{t('search.issues', { count: result.accessibilityIssues.length })}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </main>
    </div>
  );
}
