import { useLayoutEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth, useUI } from './context/AppContext';

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

function App() {
  const { isAuth } = useAuth();
  const { isLoginModalOpen, setLoginModal, isPricesModalOpen, setPricesModal, isFeedbackModalOpen, setFeedbackModal, isSettingsModalOpen, settingsMode, closeSettingsModal } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    const container = document.getElementById('scroll-container');
    if (container) container.scrollTop = 0;
  }, [location.pathname]);

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
            path="/scanner" 
            element={isAuth ? <Scanner /> : <Navigate to="/" replace />} 
          />
          <Route path="*" element={<NotFound onGoHome={() => navigate('/')} /> } />
        </Routes>
      </div>

      {isLoginModalOpen && <LoginCard onClose={() => setLoginModal(false)} />}
      {isPricesModalOpen && <Prices isModal={true} onClose={() => setPricesModal(false)} />}
      {isFeedbackModalOpen && <Feedback isOpen={isFeedbackModalOpen} onClose={() => setFeedbackModal(false)} />}
      {isSettingsModalOpen && <SettingsModal mode={settingsMode} onClose={closeSettingsModal} />}
    </div>
  );
}

export default App;