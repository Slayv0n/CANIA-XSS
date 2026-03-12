import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoFull, UserLoginIcon, UserProfileIcon } from '../assets/icons';

// 1. УБИРАЕМ onProfileClick из аргументов (он больше не нужен)
export default function Header({ onLoginClick,  isAuth, onFeatureClick, onPricesClick }) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [colorChangeTime, setColorChangeTime] = React.useState(null);
  const navigate = useNavigate(); // Хук навигации

  // Отслеживаем изменение цвета фона хедера
  React.useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;

    const observer = new MutationObserver(() => {
      const currentBg = getComputedStyle(header).backgroundColor;
      // Если цвет изменился, показываем индикатор
      if (currentBg !== 'rgba(0, 0, 0, 0)') {
        setColorChangeTime(performance.now());
        setTimeout(() => setColorChangeTime(null), 500);
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <header className="h-20 border-b border-card-border flex items-center justify-between px-10 relative z-50 header-root">
      
      <div 
        onClick={() => navigate('/')} 
        className="flex items-center cursor-pointer text-main-text hover:opacity-80 transition-opacity"
      >
        <LogoFull className="w-28 md:w-36 h-auto" />
      </div>

      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-desc-text">
        <button 
          onClick={() => {
              // Если авторизован — идем в сканер, иначе — логинимся
              if(isAuth) navigate('/scanner'); 
              else onLoginClick();
          }} 
          className='p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm'
          >
          Функционал
        </button>
        <button 
          onClick={onPricesClick} 
          className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm"
        >
          Тарифы
        </button>

        <div className="h-4 w-px bg-card-border"></div> 
        <a href="#" className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm">EN</a>
      </nav>

      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-main-text">
        {isMenuOpen ? '✕' : '☰'}
      </button>

      {/* ЛОГИКА КНОПОК */}
      {!isAuth ? (
        <button 
            onClick={onLoginClick} 
            className="bg-brand-red pl-6.5 pr-8 py-3 rounded-2xl text-sm font-bold text-white hover:bg-red-800 cursor-pointer flex items-center gap-2 "
        >
            <UserLoginIcon />
            Вход
        </button>
      ) : (
        <button 
            // 2. ИЗМЕНЕНИЕ: Жестко прописываем путь в профиль
            onClick={() => navigate('/profile')}
            className="bg-brand-red pl-4 pr-5 py-2 rounded-sm text-sm font-bold text-white hover:bg-red-700 cursor-pointer flex items-center gap-2 "
        >
            <UserProfileIcon />
            Профиль
        </button>
      )}

    </header>
  );
}