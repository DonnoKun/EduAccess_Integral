import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { useLibrarySync } from "@/hooks/useLibrarySync";
import InstallAppBanner from "@/components/InstallAppBanner";
import MobileBottomNav from "@/components/MobileBottomNav";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import SplashScreen from "@/components/SplashScreen";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/Search";
import RemediatePage from "./pages/Remediate";
import ContentViewer from "./pages/ContentViewer";
import Settings from "./pages/Settings";
import LibraryPage from "./pages/Library";
import CoursesPage from "./pages/Courses";
import GroupDetailPage from "./pages/GroupDetail";
import LessonViewerPage from "./pages/LessonViewer";
import NotFound from "./pages/NotFound";
import ReadingGuide from "./components/ReadingGuide";

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const { hasCompletedOnboarding } = useStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Auth Route wrapper (for onboarding - requires auth but not profile)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { applyProfileStyles, visualProfile, currentTheme, hasCompletedOnboarding } = useStore();
  const { isAuthenticated, initialize, initialized } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  
  // Start session tracking & library sync
  useSessionTracker();
  useLibrarySync();

  // Initialize auth on app load
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Apply visual profile on app load and when profile changes
  useEffect(() => {
    applyProfileStyles();
  }, [applyProfileStyles, visualProfile, currentTheme]);

  // Dismiss splash after auth initializes (minimum 2s for the animation)
  useEffect(() => {
    if (initialized) {
      const timer = setTimeout(() => setShowSplash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [initialized]);

  // Show splash screen while loading
  if (!initialized || showSplash) {
    return <SplashScreen visible={true} />;
  }

  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated 
          ? (hasCompletedOnboarding ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />)
          : <Navigate to="/login" replace />
      } />
      <Route path="/login" element={
        isAuthenticated 
          ? (hasCompletedOnboarding ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />)
          : <Login />
      } />
      <Route path="/onboarding" element={
        <AuthRoute>
          <Onboarding />
        </AuthRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/search" element={
        <ProtectedRoute>
          <SearchPage />
        </ProtectedRoute>
      } />
      <Route path="/remediate/:contentId" element={
        <ProtectedRoute>
          <RemediatePage />
        </ProtectedRoute>
      } />
      <Route path="/content/:contentId" element={
        <ProtectedRoute>
          <ContentViewer />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/library" element={
        <ProtectedRoute>
          <LibraryPage />
        </ProtectedRoute>
      } />
      <Route path="/courses" element={
        <ProtectedRoute>
          <CoursesPage />
        </ProtectedRoute>
      } />
      <Route path="/courses/:groupId" element={
        <ProtectedRoute>
          <GroupDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/courses/:groupId/lessons/:lessonId" element={
        <ProtectedRoute>
          <LessonViewerPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppWrapper() {
  const { readingGuideEnabled } = useStore();
  const { isAuthenticated } = useAuthStore();
  
  // Only show reading guide when user is authenticated
  const showReadingGuide = readingGuideEnabled && isAuthenticated;
  
  return (
    <div className="pb-14 md:pb-0">
      <InstallAppBanner />
      <AppContent />
      {isAuthenticated && <MobileBottomNav />}
      {isAuthenticated && <ScrollToTopButton />}
      <ReadingGuide enabled={showReadingGuide} />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppWrapper />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
