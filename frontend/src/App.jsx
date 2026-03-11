import React, { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';

import BackgroundDecor from './components/BackgroundDecor';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Safety from './components/Safety';
import Prices from './components/Prices.jsx';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import LoginCard from './components/LoginCard';
import NotFound from './pages/NotFound.jsx';
import { Profile } from './pages/Profile.jsx';
import { Scanner } from './pages/Scanner.jsx';

function App() {
  const [theme, setTheme] = useState('dark');
  const navigate = useNavigate(); 
  
  // АВТОРИЗАЦИЯ
  const [isAuth, setIsAuth] = useState(() => localStorage.getItem('isAuth') === 'true');
  
  // СОСТОЯНИЕ МОДАЛКИ (Новое!)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPricesModalOpen, setIsPricesModalOpen] = useState(false); // НОВОЕ!

  // Единая функция для обработки клика по "Тарифам"
  const handlePricesClick = (e) => {
    e?.preventDefault(); // Отменяем скачок по ссылке
    
    if (location.pathname === '/') {
      // Если мы на Главной - скроллим к блоку
      const pricingSection = document.getElementById('pricing-section');
      const scrollContainer = document.getElementById('scroll-container');
      
      if (pricingSection && scrollContainer) {
        scrollContainer.scrollTo({
          // Высчитываем позицию элемента относительно контейнера
          top: pricingSection.offsetTop, 
          behavior: 'smooth'
        });
      }
    } else {
      // Если мы на других страницах - открываем модалку
      setIsPricesModalOpen(true);
    }
  };


  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('light');
  };

  const login = () => {
  setIsAuth(true);
  localStorage.setItem('isAuth', 'true'); 
  setIsLoginModalOpen(false); 
  navigate('/profile'); // Идем в профиль, а не в сканер!
  };
  
  const logout = () => {
    setIsAuth(false);
    localStorage.removeItem('isAuth'); 
    navigate('/'); 
  };

  // НОВАЯ МАГИЯ: Авто-скролл наверх при смене страницы
  React.useLayoutEffect(() => {
    const container = document.getElementById('scroll-container');
    if (container) {
      // Жестко и моментально выкручиваем скролл в ноль
      container.scrollTop = 0;
    }
  }, [location.pathname]); // Реагируем на любую смену URL

  // Компонент Главной страницы
  const LandingPage = () => {
    // Теперь функция просто решает: открыть попап или кинуть в профиль
    const handleTryIt = () => {
      if (isAuth) navigate('/profile');
      else setIsLoginModalOpen(true); 
    };

    return (
      <>
        <Header 
          onLoginClick={() => setIsLoginModalOpen(true)}
          currentTheme={theme}
          onThemeToggle={toggleTheme}
          isAuth={isAuth}
          onFeatureClick={() => navigate('/scanner')}
          onPricesClick={handlePricesClick}
        />
        <main className="relative w-full overflow-hidden">
          <BackgroundDecor />
          <div className="relative z-10">
              {/* Передаем чистую функцию */}
              <Hero onTryClick={handleTryIt} />
              <Features onTryClick={handleTryIt} />
              <HowItWorks />
              <Safety onTryClick={handleTryIt}/>
              <Prices isModal={false}/>
              <FAQ />
          </div>
        </main>
        <Footer 
          onPricesClick={handlePricesClick}
          onLoginClick={() => setIsLoginModalOpen(true)}
        />
                
      </>
    );
  };

  const [mainColorChangeTime, setMainColorChangeTime] = React.useState(null);

  // Отслеживаем изменение цвета основного контейнера
  React.useEffect(() => {
    const mainDiv = document.querySelector('[id="scroll-container"]');
    if (!mainDiv) return;

    const observer = new MutationObserver(() => {
      const currentBg = getComputedStyle(mainDiv).backgroundColor;
      if (currentBg !== 'rgba(0, 0, 0, 0)') {
        setMainColorChangeTime(performance.now());
        setTimeout(() => setMainColorChangeTime(null), 500);
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-screen w-full bg-main-bg overflow-hidden relative">
      {mainColorChangeTime && (
        <div className="fixed top-12 right-2 bg-blue-500 text-white px-3 py-1 rounded text-xs font-mono z-9999">
          MAIN-DIV: {mainColorChangeTime.toFixed(0)}ms
        </div>
      )}
      <div id="scroll-container" className="fixed inset-0 overflow-y-auto z-10 custom-scrollbar animate-fade-in" key={location.pathname}> 
        <Routes>

          <Route path="/" element={<LandingPage />} />

          <Route 
            path="/profile" 
            element={isAuth ? <Profile onLogout={logout} currentTheme={theme} onThemeToggle={toggleTheme} onPricesClick={handlePricesClick} isAuth={isAuth} /> : <Navigate to="/" replace />} 
          />

          <Route 
            path="/scanner" 
            element={isAuth ? <Scanner onLogout={logout} currentTheme={theme} onThemeToggle={toggleTheme} onPricesClick={handlePricesClick} isAuth={isAuth} /> : <Navigate to="/" replace />} 
          />

          <Route path="*" element={<NotFound onGoHome={() => navigate('/')} /> } />
          

        </Routes>
      </div>

      {isLoginModalOpen && (
          <LoginCard 
            onClose={() => setIsLoginModalOpen(false)} 
            onLoginSuccess={login} 
          />
        )}

      {isPricesModalOpen && (
          <Prices 
            isModal={true} 
            onClose={() => setIsPricesModalOpen(false)} 
          />
      )}
      
    </div>
  );
}

export default App;