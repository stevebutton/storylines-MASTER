import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/PageTransition';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useEffect } from 'react';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Pages that require at least 'user' role (editors)
const USER_PAGES = new Set([
  'Stories', 'StoryEditor', 'SeriesEditor', 'HomePageEditor',
  'MediaLibrary', 'DocumentManager', 'Storyboarder', 'MobileStoryCapture',
  'AudioRecorder', 'ChapterPreview', 'LocationPickerPage', 'Account',
]);

// Pages that require 'admin' role
const ADMIN_PAGES = new Set(['UserManagement', 'LoginEditor']);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const location = useLocation();

  // Remove the pre-React HTML loader once React has mounted and rendered.
  // StoryMapView's own black overlay is already in the DOM by this point,
  // so there is no uncovered frame between the two.
  useEffect(() => {
    const loader = document.getElementById('page-loader');
    if (loader) loader.remove();
  }, []);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition>
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          </PageTransition>
        } />
        {Object.entries(Pages).map(([path, Page]) => {
          const pageEl = (
            <PageTransition>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </PageTransition>
          );

          let element;
          if (ADMIN_PAGES.has(path)) {
            element = <ProtectedRoute requiredRole="admin">{pageEl}</ProtectedRoute>;
          } else if (USER_PAGES.has(path)) {
            element = <ProtectedRoute>{pageEl}</ProtectedRoute>;
          } else {
            element = pageEl;
          }

          return <Route key={path} path={`/${path}`} element={element} />;
        })}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster
          position="bottom-center"
          toastOptions={{ style: { fontSize: '15px', padding: '14px 18px' } }}
          richColors
        />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
