import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAccessToken, getRefreshToken, getTokenExpiration, refreshTokenRequest } from '../api';

export type Theme = 'dark' | 'light';

interface AuthContextType {
  isAuth: boolean;
  userEmail: string | null;
  hasSubscription: boolean;
  notification: string | null;
  setNotification: (message: string | null) => void;
  login: (email: string) => void;
  logout: () => void;
  updateSubscriptionStatus: () => Promise<void>;
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

  isChangePasswordModalOpen: boolean;
  setChangePasswordModal: (open: boolean) => void;
  isChangeEmailModalOpen: boolean;
  setChangeEmailModal: (open: boolean) => void;

  isSettingsModalOpen: boolean;
  settingsMode: 'password' | 'email';
  openSettingsModal: (mode: 'password' | 'email') => void;
  closeSettingsModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const UIContext = createContext<UIContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  // Состояния авторизации
  const [isAuth, setIsAuth] = useState<boolean>(() => {
    const token = getAccessToken();
    const refresh = getRefreshToken();
    return Boolean(token && refresh);
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('userEmail'));
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const tokenRefreshTimerRef = useRef<number | null>(null);

  // Состояния UI
  const [theme, setTheme] = useState<Theme>('dark');
  const [isLoginModalOpen, setLoginModal] = useState(false);
  const [isPricesModalOpen, setPricesModal] = useState(false);
  const [isFeedbackModalOpen, setFeedbackModal] = useState(false);
  const [isChangePasswordModalOpen, setChangePasswordModal] = useState(false);
  const [isChangeEmailModalOpen, setChangeEmailModal] = useState(false);

  const[isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState<'password' | 'email'>('password');

  const openSettingsModal = (mode: 'password' | 'email') => {
    setSettingsMode(mode);
    setIsSettingsModalOpen(true);
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  // Функция проверки подписки на сервере
  const updateSubscriptionStatus = async () => {
    if (!isAuth) {
      setHasSubscription(false);
      return;
    }

    try {
      const sub = await api.getMySubscription();
      setHasSubscription(!!sub);
    } catch (e) {
      setHasSubscription(false);
    }
  };

  // Проверяем подписку при загрузке страницы, если пользователь вошел
  useEffect(() => {
    if (isAuth) {
      updateSubscriptionStatus();
    }
  }, [isAuth]);

  const login = (email: string) => {
    localStorage.setItem('isAuth', 'true');
    localStorage.setItem('userEmail', email);
    setIsAuth(true);
    setUserEmail(email);
    setLoginModal(false);
    setNotification('Вы успешно вошли.');
    navigate('/profile');
  };

  const logout = () => {
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
    localStorage.removeItem('isAuth');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setIsAuth(false);
    setUserEmail(null);
    setHasSubscription(false); // Это просто очистка экрана для гостя
    setNotification(null);
    navigate('/');
  };

  useEffect(() => {
    if (!isAuth) return;

    const token = getAccessToken();
    const expiration = getTokenExpiration(token);
    if (!expiration) return;

    const refreshInMs = expiration * 1000 - Date.now() - 30000; // 30s before expire

    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }

    const doRefresh = async () => {
      const ok = await refreshTokenRequest();
      if (!ok) {
        setNotification('Сессия истекла, пожалуйста, войдите снова.');
        logout();
        return;
      }
      setNotification('Токен обновлен автоматически.');
      setIsAuth(true);
    };

    if (refreshInMs <= 0) {
      doRefresh();
      return;
    }

    tokenRefreshTimerRef.current = window.setTimeout(doRefresh, refreshInMs);

    return () => {
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
    };
  }, [isAuth, logout]);

  // В случае устаревшего access token - челленж бэкенда вызывает этот эвент
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
      setNotification('Сессия истекла, пожалуйста, войдите снова.');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [logout]);

  const toggleTheme = () => {
    document.documentElement.classList.add('theme-transition-disable');
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    window.getComputedStyle(document.documentElement).opacity;
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition-disable');
    }, 10);
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
      <AuthContext.Provider value={{ isAuth, userEmail, hasSubscription, notification, setNotification, login, logout, updateSubscriptionStatus }}>
        <UIContext.Provider value={{ 
          isLoginModalOpen, setLoginModal, 
          isPricesModalOpen, setPricesModal,
          isFeedbackModalOpen, setFeedbackModal,
          handlePricesClick,
          isChangePasswordModalOpen, setChangePasswordModal,
          isChangeEmailModalOpen, setChangeEmailModal,
          isSettingsModalOpen, openSettingsModal,
          settingsMode,  closeSettingsModal
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