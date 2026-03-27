import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export type Theme = 'dark' | 'light';

interface AuthContextType {
  isAuth: boolean;
  userEmail: string | null; // <--- ДОБАВИЛИ
  login: (email: string) => void; // <--- ТЕПЕРЬ ПЕРЕДАЕМ EMAIL
  logout: () => void;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

interface UIContextType {
  isLoginModalOpen: boolean;
  setLoginModal: (open: boolean) => void;
  isPricesModalOpen: boolean;
  setPricesModal: (open: boolean) => void;
  isFeedbackModalOpen: boolean;
  setFeedbackModal: (open: boolean) => void;
  handlePricesClick: (e?: React.MouseEvent) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const UIContext = createContext<UIContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate(); // Добавляем навигацию сюда
  
  const [isAuth, setIsAuth] = useState<boolean>(() => localStorage.getItem('isAuth') === 'true');
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('userEmail')); // <--- ДОБАВИЛИ
  const [theme, setTheme] = useState<Theme>('dark');
  const [isLoginModalOpen, setLoginModal] = useState(false);
  const [isPricesModalOpen, setPricesModal] = useState(false);
  const [isFeedbackModalOpen, setFeedbackModal] = useState(false);

  const login = (email: string) => {
    setIsAuth(true);
    setUserEmail(email);
    localStorage.setItem('isAuth', 'true');
    localStorage.setItem('userEmail', email);
    setLoginModal(false);
    navigate('/profile');
  };

  const logout = () => {
    setIsAuth(false);
    setUserEmail(null);
    localStorage.removeItem('isAuth');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken'); // если сохранял
    navigate('/');
  };

  const toggleTheme = () => {
    // 1. Блокируем ВСЕ анимации на странице
    document.documentElement.classList.add('disable-transitions');

    // 2. Вычисляем и ставим новую тему
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    // 3. Заставляем браузер применить цвета прямо сейчас (до возврата анимаций)
    window.getComputedStyle(document.documentElement).cssText;

    // 4. Снимаем блокировку. Теперь hover-эффекты снова работают!
    document.documentElement.classList.remove('disable-transitions');
  };

  const handlePricesClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (window.location.pathname === '/') {
      const pricingSection = document.getElementById('pricing-section');
      const scrollContainer = document.getElementById('scroll-container');
      if (pricingSection && scrollContainer) {
        scrollContainer.scrollTo({ top: pricingSection.offsetTop, behavior: 'smooth' });
      }
    } else {
      setPricesModal(true);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthContext.Provider value={{ isAuth, userEmail, login, logout }}>
        <UIContext.Provider value={{ 
          isLoginModalOpen, setLoginModal, 
          isPricesModalOpen, setPricesModal,
          isFeedbackModalOpen, setFeedbackModal,
          handlePricesClick 
        }}>
          {children}
        </UIContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AppProvider");
  return context;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within AppProvider");
  return context;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within AppProvider");
  return context;
};