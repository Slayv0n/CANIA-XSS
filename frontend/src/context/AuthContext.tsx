import { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAccessToken, getRefreshToken, getTokenExpiration, refreshTokenRequest, clearTokens } from '../api';

export type AuthContextState = {
  isAuth: boolean;
  userEmail: string | null;
  hasSubscription: boolean;
  notification: string | null;
  setNotification: (message: string | null) => void;
  login: (email: string) => void;
  logout: () => void;
  updateSubscriptionStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const [isAuth, setIsAuth] = useState<boolean>(() => {
    const token = getAccessToken();
    const refresh = getRefreshToken();
    return Boolean(token && refresh);
  });
  
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('userEmail'));
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const tokenRefreshTimerRef = useRef<number | null>(null);

  // Функция для загрузки данных профиля (Email) с бэкенда
  const loadUserProfile = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const profile = await api.getProfile(); // Вызов /api/users/account
      if (profile && profile.email) {
        setUserEmail(profile.email);
        localStorage.setItem('userEmail', profile.email);
      }
    } catch (err) {
      console.error("Ошибка загрузки профиля:", err);
    }
  }, []);

  const logout = useCallback(() => {
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
    localStorage.removeItem('isAuth');
    localStorage.removeItem('userEmail');
    clearTokens();
    setIsAuth(false);
    setUserEmail(null);
    setHasSubscription(false);
    setNotification(null);
    navigate('/');
  }, [navigate]);

  const updateSubscriptionStatus = useCallback(async () => {
    if (!isAuth) {
      setHasSubscription(false);
      return;
    }
    try {
      const sub = await api.getMySubscription();
      setHasSubscription(!!sub);
    } catch {
      setHasSubscription(false);
    }
  }, [isAuth]);

  const login = useCallback((email: string) => {
    localStorage.setItem('isAuth', 'true');
    setIsAuth(true);
    
    if (email === 'Google User') {
      // Если вошли через OAuth, почту не знаем — грузим из API
      loadUserProfile();
    } else {
      // Если обычный логин — почта у нас уже есть
      setUserEmail(email);
      localStorage.setItem('userEmail', email);
    }
    
    setNotification('Вы успешно вошли.');
  }, [loadUserProfile]);

  // Загружаем профиль и подписку при инициализации, если авторизованы
  useEffect(() => {
    if (isAuth) {
      updateSubscriptionStatus();
      if (!userEmail || userEmail === 'Google User') {
        loadUserProfile();
      }
    }
  }, [isAuth, updateSubscriptionStatus, loadUserProfile, userEmail]);

  // Логика автоматического обновления токена (рефреш)
  useEffect(() => {
    if (!isAuth) return;

    const token = getAccessToken();
    const exp = getTokenExpiration(token);
    if (!exp) return;

    const refreshInMs = exp * 1000 - Date.now() - 10000; // за 10 сек до конца

    const doRefresh = async () => {
      const ok = await refreshTokenRequest();
      if (!ok) {
        setNotification('Сессия истекла, пожалуйста, войдите снова.');
        logout();
        return;
      }
      setIsAuth(true);
    };

    if (refreshInMs <= 0) {
      doRefresh();
      return;
    }

    tokenRefreshTimerRef.current = window.setTimeout(doRefresh, refreshInMs);

    return () => {
      if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
    };
  }, [isAuth, logout]);

  const contextValue = useMemo(() => ({
    isAuth,
    userEmail,
    hasSubscription,
    notification,
    setNotification,
    login,
    logout,
    updateSubscriptionStatus
  }), [isAuth, userEmail, hasSubscription, notification, login, logout, updateSubscriptionStatus]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};