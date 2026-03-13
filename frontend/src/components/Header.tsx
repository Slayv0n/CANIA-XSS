import { useNavigate } from 'react-router-dom';
import { useAuth, useUI } from '../context/AppContext';
import { LogoFull, UserLoginIcon, UserProfileIcon } from '../assets/icons';

export default function Header() {
  const navigate = useNavigate();
  const { isAuth } = useAuth();
  const { setLoginModal, handlePricesClick } = useUI();

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
        <button 
            onClick={() => navigate('/profile')}
            className="bg-brand-red pl-4 pr-5 py-2 rounded-sm text-sm font-bold text-white hover:bg-red-700 cursor-pointer flex items-center gap-2 "
            aria-label="Войти в профиль"
        >
            <UserProfileIcon />
            Профиль
        </button>
      )}

    </header>
  );
}