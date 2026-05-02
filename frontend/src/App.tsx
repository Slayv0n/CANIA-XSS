import React, { useEffect, useLayoutEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';

// Контексты
import { useAuth } from './context/AuthContext';
import { useUI } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

// Страницы и глобальные компоненты
import Landing from './pages/Landing';
import LoginCard from './components/LoginCard';
import Feedback from './components/Feedback';
import Prices from './components/Prices';
import NotFound from './pages/NotFound';
import SettingsModal from './components/SettingsModal';
import OAuthCallback from './pages/OAuthCallback';


const Profile = React.lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const Scanner = React.lazy(() => import('./pages/Scanner').then(module => ({ default: module.Scanner })));

function LoadingFallback() {
  const { t } = useLanguage();
  return (
    <div className="flex h-screen items-center justify-center text-brand-red animate-pulse font-bold uppercase">
      {t('common.loading')}
    </div>
  );
}

function AppRoutes() {
  const { isAuth, notification, setNotification } = useAuth();
  const { 
    showToast, 
    isLoginModalOpen, setLoginModal, 
    isPricesModalOpen, setPricesModal, 
    isFeedbackModalOpen, setFeedbackModal, 
    isSettingsModalOpen, settingsMode, closeSettingsModal 
  } = useUI();
  
  const navigate = useNavigate();
  const location = useLocation();

  // Скролл наверх при смене страницы
  useLayoutEffect(() => {
    const container = document.getElementById('scroll-container');
    if (container) container.scrollTop = 0;
  }, [location.pathname]);

  // Мостик для уведомлений из AuthContext -> UIContext
  useEffect(() => {
    if (notification) {
      showToast(notification, 'success');
      setNotification(null);
    }
  }, [notification, showToast, setNotification]);

  // Закрытие модалок по Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLoginModal(false);
        setPricesModal(false);
        setFeedbackModal(false);
        closeSettingsModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setLoginModal, setPricesModal, setFeedbackModal, closeSettingsModal]);

  return (
    <div className="h-screen w-full bg-main-bg overflow-hidden relative">
      <div id="scroll-container" className="fixed inset-0 overflow-y-auto z-10 custom-scrollbar animate-fade-in">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route 
              path="/profile" 
              element={isAuth ? <Profile /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/scanner/:taskId?" 
              element={isAuth ? <Scanner /> : <Navigate to="/" replace />} 
            />
            <Route path="/oauth-callback" element={<OAuthCallback />} />
            <Route path="*" element={<NotFound onGoHome={() => navigate('/')} /> } />
          </Routes>
        </Suspense> 
      </div>

      {/* Глобальные модалки */}
      {isLoginModalOpen && <LoginCard onClose={() => setLoginModal(false)} />}
      {isPricesModalOpen && <Prices isModal={true} onClose={() => setPricesModal(false)} />}
      {isFeedbackModalOpen && <Feedback isOpen={isFeedbackModalOpen} onClose={() => setFeedbackModal(false)} />}
      {isSettingsModalOpen && <SettingsModal mode={settingsMode} onClose={closeSettingsModal} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <UIProvider>
            <AppRoutes />
          </UIProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}