import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './hooks';
import { useAnalytics } from './hooks/use-analytics';
import { useAppInitialization } from './hooks/use-app-initialization';
import { AuthProvider } from './components/auth/auth-provider';
import { ProtectedRoute } from './components/auth/protected-route';
import { LoginPage } from './components/auth/login-page';
import { validateAuthConfig } from './config/auth';
import { ChatPage, AdminPage } from './pages';
import { PromptLibraryPage } from './pages/prompt-library-page';
import { AnnouncementManager } from './components/announcements/announcement-manager';
import { AnnouncementSystemDemo } from './components/announcements/announcement-demo';
import { SonnerToastProvider } from './components/ui/sonner-toast-provider';
import './styles/sonner.css';

function AppInitializationLoader({ 
  isInitializing, 
  progress, 
  currentStep, 
  error 
}: { 
  isInitializing: boolean; 
  progress: number; 
  currentStep: string; 
  error: string | null; 
}) {
  if (!isInitializing && !error) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-4 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">
            {error ? 'Initialization Failed' : 'Starting Application...'}
          </h2>
          {error ? (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">{currentStep}</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{progress.toFixed(0)}%</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { theme, resolvedTheme } = useTheme();
  const { trackPage } = useAnalytics();
  
  // Initialize application
  const {
    isInitialized,
    isInitializing,
    error: initError,
    progress,
    currentStep,
  } = useAppInitialization(true);

  useEffect(() => {
    // Only run tracking after initialization is complete
    if (!isInitialized) return;
    
    // Validate auth configuration
    const authValidation = validateAuthConfig();
    if (!authValidation.isValid) {
      console.error('Auth configuration errors:', authValidation.errors);
    }
    
    // Track app initialization
    trackPage('app_loaded', {
      app_version: '1.0.0',
      environment: process.env.NODE_ENV,
      theme: resolvedTheme,
      auth_configured: authValidation.isValid,
      timestamp: Date.now(),
    });
  }, [theme, resolvedTheme, trackPage, isInitialized]);

  // Show loading screen during initialization
  if (!isInitialized || isInitializing) {
    return (
      <AppInitializationLoader
        isInitializing={isInitializing}
        progress={progress}
        currentStep={currentStep}
        error={initError}
      />
    );
  }

  return (
    <AuthProvider>
      <SonnerToastProvider>
        <Router>
          <div className="min-h-screen relative overflow-hidden transition-colors duration-300">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 opacity-10 dark:opacity-0 blur-2xl"
            style={{
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(60px) brightness(1)',
            }}
            ></div>
          
          {/* Main content */}
          <div className="relative z-10">
            {/* Global Announcement Manager */}
            <AnnouncementManager />
            
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/callback" element={<LoginPage />} />
                <Route path="/login/callback" element={<LoginPage />} />
                
                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Navigate to="/chat" replace />
                  </ProtectedRoute>
                } />
                
                <Route path="/chat" element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                } />
                <Route path="/chat/new" element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                } />
                <Route path="/chat/ask" element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                } />
                <Route path="/chat/investigate" element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                } />
                <Route path="/chat/ask/:sessionId" element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                } />
                <Route path="/chat/investigate/:sessionId" element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                } />
                <Route path="/chat/:sessionId" element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                } />
                
                {/* Admin routes */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                } />
                
                {/* Prompt Library route */}
                <Route path="/prompts" element={
                  <ProtectedRoute>
                    <PromptLibraryPage />
                  </ProtectedRoute>
                } />
                
                {/* Demo route for announcement system */}
                <Route path="/demo/announcements" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-background">
                      <div className="container mx-auto py-8">
                        <AnnouncementSystemDemo />
                      </div>
                    </div>
                  </ProtectedRoute>
                } />
                
                {/* Catch all - redirect to chat */}
                <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
      </SonnerToastProvider>
    </AuthProvider>
  );
}
