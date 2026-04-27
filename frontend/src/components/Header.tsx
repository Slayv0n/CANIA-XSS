import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LogoFull, UserLoginIcon, UserProfileIcon, Dark, Light, Password, Mail, FeedbackIcon, Exit } from '../assets/icons';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const { t, toggleLanguage, lang } = useLanguage();
  const navigate = useNavigate();
  const { isAuth, logout, userEmail } = useAuth();
  const { setLoginModal, handlePricesClick, setFeedbackModal, openSettingsModal } = useUI();
  const { theme, toggleTheme } = useTheme();
  
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  
  // 1. Создаем ссылку на ВСЮ шапку
  const headerRef = useRef<HTMLElement>(null);

  // 2. Закрываем ВСЕ меню при клике вне шапки
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Если клик был НЕ внутри headerRef — закрываем оба меню
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    // Слушаем клики, только если хоть одно меню открыто
    if (isProfileMenuOpen || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  },[isProfileMenuOpen, isMobileMenuOpen]);

  // 3. Умные переключатели (Взаимоисключение)
  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
    if (!isProfileMenuOpen) setIsMobileMenuOpen(false); // Если открываем профиль - закрываем бургер
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) setIsProfileMenuOpen(false); // Если открываем бургер - закрываем профиль
  };

  return (
    // ВАЖНО: Вешаем headerRef на сам тег header
    <header ref={headerRef} className="h-20 border-b border-light-red flex items-center justify-between px-6 md:px-10 relative z-50 header-root bg-main-bg">

      <button
        onClick={() => navigate('/')}
        className="flex items-center cursor-pointer text-main-text hover:opacity-80 transition-opacity rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
        aria-label={t('header.home')}
        title={t('header.home')}
      >
        <LogoFull className="w-28 md:w-36 h-auto" />
      </button>

      {/* ДЕСКТОПНОЕ МЕНЮ */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-desc-text">
        <button
          onClick={() => {
              if(isAuth) navigate('/scanner');
              else setLoginModal(true);
          }}
          className='p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red'
          >
          {t('header.features')}
        </button>
        <button
          onClick={handlePricesClick}
          className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
        >
          {t('header.tariffs')}
        </button>

        <div className="h-4 w-px bg-card-border"></div>
        <button 
          onClick={toggleLanguage} 
          className="cursor-pointer p-1 font-bold hover:text-brand-red transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red rounded"
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>
      </nav>

      {/* ПРАВАЯ ЧАСТЬ */}
      <div className="flex items-center gap-4">
          
          {!isAuth ? (
            <button
                onClick={() => setLoginModal(true)}
                className="bg-brand-red pl-6.5 pr-8 py-3 rounded-2xl text-sm font-bold text-white hover:bg-red-800 cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-main-bg"
                aria-label={t('header.login')}
            >
                <UserLoginIcon />
                 {t('header.login')}
            </button>
          ) : (
            <div className="relative">
              <button
                  onClick={toggleProfileMenu} // ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ
                  className="bg-transparent border-2 border-brand-red p-4 rounded-full text-sm font-bold text-white hover:bg-red-800 transition-colors duration-300 cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-main-bg"
                  aria-label={t('profileMenu.profile')}
                  aria-expanded={isProfileMenuOpen}
              >
                  <UserProfileIcon />
              </button>

              {/* Выпадающее меню профиля */}
              <div
                className={`absolute min-w-60 h-auto py-4 bg-main-bg border border-card-border shadow-2xl top-17 right-0 rounded-2xl flex flex-col items-start gap-1 px-4 transition-all duration-300 ease-out origin-top-right z-[100] ${
                  isProfileMenuOpen
                    ? 'opacity-100 pointer-events-auto translate-y-0 scale-100 visible'
                    : 'opacity-0 pointer-events-none -translate-y-4 scale-95 invisible'
                }`}
              >
                {/* Email с подчеркиванием */}
                <button
                  onClick={() => { navigate('/profile'); setIsProfileMenuOpen(false); }}
                  className='pb-4 mb-2 border-b border-card-border transition-colors duration-300 cursor-pointer hover:text-brand-red text-main-text text-base truncate w-full text-left focus-visible:outline-none focus-visible:text-brand-red'
                  title={userEmail || t('profileMenu.profile')}
                >
                  {userEmail || t('profileMenu.profile')}
                </button>

                <button onClick={toggleTheme} className='w-full py-2.5 flex items-center gap-3 cursor-pointer text-main-text hover:text-brand-red transition-colors focus-visible:outline-none focus-visible:text-brand-red'>
                  {theme === 'dark' ? <><Light /> {t('profileMenu.themeLight')}</> : <><Dark /> {t('profileMenu.themeDark')}</>}
                </button>

                <button onClick={() => { openSettingsModal('password'); setIsProfileMenuOpen(false); }} className='w-full py-2.5 flex items-center gap-3 cursor-pointer text-main-text hover:text-brand-red transition-colors focus-visible:outline-none focus-visible:text-brand-red'>
                  <Password /> {t('profileMenu.changePassword')}
                </button>

                <button onClick={() => { openSettingsModal('email'); setIsProfileMenuOpen(false); }} className='w-full py-2.5 flex items-center gap-3 cursor-pointer text-main-text hover:text-brand-red transition-colors focus-visible:outline-none focus-visible:text-brand-red'>
                  <Mail /> {t('profileMenu.changeEmail')}
                </button>

                <button onClick={() => { setFeedbackModal(true); setIsProfileMenuOpen(false); }} className='w-full py-2.5 flex items-center gap-3 cursor-pointer text-main-text hover:text-brand-red transition-colors focus-visible:outline-none focus-visible:text-brand-red'>
                  <FeedbackIcon /> {t('profileMenu.feedback')}
                </button>

                {/* Выход с подчеркиванием сверху */}
                <button onClick={() => { logout(); navigate('/'); setIsProfileMenuOpen(false); }} className='w-full pt-4 mt-2 border-t border-card-border flex items-center gap-3 cursor-pointer text-main-text hover:text-brand-red transition-colors focus-visible:outline-none focus-visible:text-brand-red'>
                  <Exit /> {t('profileMenu.logout')}
                </button>
              </div>
            </div>
          )}

          {/* КНОПКА БУРГЕРА (Видна только на телефонах: md:hidden) */}
          <button 
              onClick={toggleMobileMenu} // ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ
              className="md:hidden p-2 text-desc-text hover:text-brand-red transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
              aria-label="Меню"
          >
              {isMobileMenuOpen ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              )}
          </button>

      </div>

      {/* ВЫПАДАЮЩЕЕ МЕНЮ ДЛЯ МОБИЛОК */}
      <div 
        className={`absolute top-20 left-0 w-full bg-main-bg border-b border-light-red flex flex-col items-center gap-6 py-6 md:hidden z-40 transition-all duration-300 origin-top shadow-xl ${
            isMobileMenuOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'
        }`}
        style={{ transitionProperty: 'opacity, transform, visibility' }}
      >
        <button
          onClick={() => {
              setIsMobileMenuOpen(false);
              if(isAuth) navigate('/scanner');
              else setLoginModal(true);
          }}
          className='p-2 hover:text-brand-red transition-colors duration-300 uppercase font-bold text-sm text-desc-text focus-visible:outline-none focus-visible:text-brand-red'
        >
          {t('header.features')}
        </button>
        <button
          onClick={() => {
              setIsMobileMenuOpen(false);
              handlePricesClick();
          }}
          className="p-2 hover:text-brand-red transition-colors duration-300 uppercase font-bold text-sm text-desc-text focus-visible:outline-none focus-visible:text-brand-red"
        >
          {t('header.tariffs')}
        </button>
        <button 
          onClick={() => {
              setIsMobileMenuOpen(false);
              toggleLanguage();
          }} 
          className="p-2 text-brand-red font-bold uppercase transition-colors focus-vi{/* Выпадающее меню профиля */}sible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red rounded"
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>
      </div>

    </header>
  );
}