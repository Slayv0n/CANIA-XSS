import { useNavigate } from 'react-router-dom';
import { useAuth, useUI, useTheme } from '../context/AppContext';
import { LogoFull, UserLoginIcon, UserProfileIcon, Dark, Light, Password, Mail, FeedbackIcon, Exit } from '../assets/icons';
import { useState, useRef, useEffect } from 'react';
export default function Header() {
  const navigate = useNavigate();
  const { isAuth, logout } = useAuth();
  const { setLoginModal, handlePricesClick } = useUI();
  const { theme, toggleTheme } = useTheme();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

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
              if(isAuth) navigate('/scanner'); 
              else setLoginModal(true);
          }} 
          className='p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm cursor-pointer'
          >
          Функционал
        </button>
        <button 
          onClick={handlePricesClick} 
          className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm cursor-pointer"
        >
          Тарифы
        </button>

        <div className="h-4 w-px bg-card-border"></div> 
        <a href="#" className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm">EN</a>
      </nav>

      {!isAuth ? (
        <button
            onClick={() => setLoginModal(true)}
            className="bg-brand-red pl-6.5 pr-8 py-3 rounded-2xl text-sm font-bold text-white hover:bg-red-800 cursor-pointer flex items-center gap-2 "
            aria-label="Войти в аккаунт"
        >
            <UserLoginIcon />
            Вход
        </button>
      ) : (
        <div ref={menuRef} className="relative">
          <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="bg-transparent border-2 border-brand-red p-4 rounded-full text-sm font-bold text-white hover:bg-red-800 cursor-pointer flex items-center gap-2 transition-colors duration-300"
              aria-label="Войти в профиль"
              aria-expanded={isProfileMenuOpen}
          >
              <UserProfileIcon />
          </button>
          
          <div
            className={`absolute w-50 h-60 bg-brand-gray top-16 -left-30 rounded-2xl flex flex-col items-start justify-between px-4 transition-all duration-300 ${
              isProfileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
          >
            {/* надо будет что то с invisible сделать, плавного перехода нет */}
            <h3 
              onClick={() => {
                navigate('/profile');
                setIsProfileMenuOpen(false);
              }} 
              className='pt-4 cursor-pointer hover:text-brand-red transition-colors'
            >
              почта@example.com
            </h3>

            <button  onClick={toggleTheme} className='flex place-items-center gap-2 cursor-pointer'>
              {theme === 'light' ? (
                <>
                  <Dark /> Светлая тема
                </>
              ) : (
                <>
                  <Light /> Тёмная тема
                </>
              )}
            </button>

            <button className='flex place-items-start gap-2 cursor-pointer'>
              <Password /> Смена пароля
            </button>

            <button className='flex place-items-center gap-2 cursor-pointer'>
              <Mail /> Смена почты
            </button>

            <button className='flex place-items-center gap-2 cursor-pointer'>
              <FeedbackIcon /> Отправить отзыв
            </button>

            <button 
              onClick={() => {
                logout();
                navigate('/');
                setIsProfileMenuOpen(false);
              }} 
              className='pb-4 flex place-items-center gap-2 cursor-pointer'
            >
              <Exit /> Выход
            </button>
          </div>
        </div>
      )}

    </header>
  );
}