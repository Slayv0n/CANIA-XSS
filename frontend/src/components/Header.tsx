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
  const { isAuth, logout, userEmail } = useAuth(); // <--- ДОБАВЬ userEmail
  const { setLoginModal, handlePricesClick, setFeedbackModal, openSettingsModal } = useUI();
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
    <header className="h-20 border-b border-light-red flex items-center justify-between px-10 relative z-50 header-root">

      <button
        onClick={() => navigate('/')}
        className="flex items-center cursor-pointer text-main-text hover:opacity-80 transition-opacity rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
        aria-label={t('header.home')}
        title={t('header.home')}
      >
        <LogoFull className="w-28 md:w-36 h-auto" />
      </button>

      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-desc-text">
        <button
          onClick={() => {
              if(isAuth) navigate('/scanner');
              else setLoginModal(true);
          }}
          className='p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm cursor-pointer'
          >
          {t('header.features')}
        </button>
        <button
          onClick={handlePricesClick}
          className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm cursor-pointer"
        >
          {t('header.tariffs')}
        </button>

        <div className="h-4 w-px bg-card-border"></div>
        {/* className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm" */}
        <button 
          onClick={toggleLanguage} 
          className="cursor-pointer p-1"
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>
      </nav>

      {!isAuth ? (
        <button
            onClick={() => setLoginModal(true)}
            className="bg-brand-red pl-6.5 pr-8 py-3 rounded-2xl text-sm font-bold text-white hover:bg-red-800 cursor-pointer flex items-center gap-2 "
            aria-label={t('header.login')}
        >
            <UserLoginIcon />
             {t('header.login')}
        </button>
      ) : (
        <div ref={menuRef} className="relative">
          <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="bg-transparent border-2 border-brand-red p-4 rounded-full text-sm font-bold text-white hover:bg-red-800 transition-colors duration-300 cursor-pointer flex items-center gap-2"
              aria-label={t('profileMenu.profile')}
              aria-expanded={isProfileMenuOpen}
          >
              <UserProfileIcon />
          </button>

          <div
            className={`absolute w-50 h-60 bg-brand-gray top-16 -left-30 rounded-2xl flex flex-col items-start justify-between px-4 transition-all duration-500 origin-top ${
              isProfileMenuOpen
                ? 'opacity-100 pointer-events-auto translate-y-0 scale-100'
                : 'opacity-0 pointer-events-none -translate-y-4 scale-95'
            }`}
            style={{ transitionProperty: 'opacity, transform, scale' }}
          >
            {/* надо будет что то с invisible сделать, плавного перехода нет */}
            <h3
              onClick={() => {
                navigate('/profile');
                setIsProfileMenuOpen(false);
              }}
              className='pt-4 cursor-pointer hover:text-brand-red text-lg truncate w-full'
              title={userEmail || t('profileMenu.profile')}
              style={{ transition: 'none' }}
            >
              {userEmail || t('profileMenu.profile')}
            </h3>

            <button  onClick={toggleTheme} className='flex place-items-center gap-2 cursor-pointer' style={{ transition: 'none' }}>
              {theme === 'dark' ? (
                <>
                  <Light /> {t('profileMenu.themeLight')}
                </>
              ) : (
                <>
                  <Dark /> {t('profileMenu.themeDark')}
                </>
              )}
            </button>

            <button
              onClick={() => { openSettingsModal('password'); setIsProfileMenuOpen(false); }}
              className='flex place-items-start gap-2 cursor-pointer'>
              <Password /> {t('profileMenu.changePassword')}
            </button>

            <button
              onClick={() => { openSettingsModal('email'); setIsProfileMenuOpen(false); }}
              className='flex place-items-center gap-2 cursor-pointer'>
              <Mail /> {t('profileMenu.changeEmail')}
            </button>

            <button
              onClick={() => setFeedbackModal(true)}
              className='flex place-items-center gap-2 cursor-pointer'>
              <FeedbackIcon /> {t('profileMenu.feedback')}
            </button>

            <button
              onClick={() => {
                logout();
                navigate('/');
                setIsProfileMenuOpen(false);
              }}
              className='pb-4 flex place-items-center gap-2 cursor-pointer'
              style={{ transition: 'none' }}
            >
              <Exit /> {t('profileMenu.logout')}
            </button>
          </div>
        </div>
      )}

    </header>
  );
}