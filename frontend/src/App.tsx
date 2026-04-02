import { useEffect, useLayoutEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useUI } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';

import BackgroundDecor from './components/BackgroundDecor';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Safety from './components/Safety';
import Prices from './components/Prices';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import LoginCard from './components/LoginCard';
import Feedback from './components/Feedback';
import NotFound from './pages/NotFound';
import { Profile } from './pages/Profile';
import { Scanner } from './pages/Scanner';
import SettingsModal from './components/SettingsModal';

function AppRoutes() {
  const { isAuth, notification, setNotification } = useAuth();
  const { isLoginModalOpen, setLoginModal, isPricesModalOpen, setPricesModal, isFeedbackModalOpen, setFeedbackModal, isSettingsModalOpen, settingsMode, closeSettingsModal } = useUI();
  const [isNotificationClosing, setIsNotificationClosing] = useState(false);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    const container = document.getElementById('scroll-container');
    if (container) container.scrollTop = 0;
  }, [location.pathname]);

  useEffect(() => {
    let autoCloseTimer: number;
    if (notification) {
      setIsNotificationVisible(true);
      setIsNotificationClosing(false);
      autoCloseTimer = window.setTimeout(() => setIsNotificationClosing(true), 5000);
    } else {
      setIsNotificationVisible(false);
      setIsNotificationClosing(false);
    }

    return () => {
      if (autoCloseTimer) window.clearTimeout(autoCloseTimer);
    };
  }, [notification]);

  useEffect(() => {
    let hideTimer: number;

    if (isNotificationClosing) {
      hideTimer = window.setTimeout(() => {
        setNotification(null);
        setIsNotificationVisible(false);
        setIsNotificationClosing(false);
      }, 400);
    }

    return () => {
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [isNotificationClosing, setNotification]);

  const LandingPage = () => {
    const handleTryIt = () => {
      if (isAuth) navigate('/profile');
      else setLoginModal(true);
    };

    return (
      <>
        <Header />
        <main className="relative w-full overflow-hidden">
          <BackgroundDecor />
          <div className="relative z-10">
            <Hero onTryClick={handleTryIt} />
            <Features onTryClick={handleTryIt} />
            <HowItWorks />
            <Safety onTryClick={handleTryIt}/>
            <Prices isModal={false}/>
            <FAQ />
          </div>
        </main>
        <Footer />
      </>
    );
  };

  return (
    <div className="h-screen w-full bg-main-bg overflow-hidden relative">
      <div id="scroll-container" className="fixed inset-0 overflow-y-auto z-10 custom-scrollbar animate-fade-in"> 
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/profile" 
            element={isAuth ? <Profile /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/scanner/:taskId?" 
            element={isAuth ? <Scanner /> : <Navigate to="/" replace />} 
          />
          <Route path="*" element={<NotFound onGoHome={() => navigate('/')} /> } />
        </Routes>
      </div>

      {isLoginModalOpen && <LoginCard onClose={() => setLoginModal(false)} />}
      {isPricesModalOpen && <Prices isModal={true} onClose={() => setPricesModal(false)} />}
      {isFeedbackModalOpen && <Feedback isOpen={isFeedbackModalOpen} onClose={() => setFeedbackModal(false)} />}
      {isSettingsModalOpen && <SettingsModal mode={settingsMode} onClose={closeSettingsModal} />}

      {isNotificationVisible && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl border border-white/20 bg-black/80 p-4 text-sm text-white shadow-xl ${isNotificationClosing ? 'animate-notification-out' : 'animate-notification-in'}`}>
          <div className="flex items-center gap-3">
            <span>{notification}</span>
            <button onClick={() => { setNotification(null); setIsNotificationClosing(false); setIsNotificationVisible(false); }} className="text-brand-red hover:text-white">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UIProvider>
          <AppRoutes />
        </UIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
