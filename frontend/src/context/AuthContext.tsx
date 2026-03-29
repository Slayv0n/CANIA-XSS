import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAccessToken, getRefreshToken, getTokenExpiration, refreshTokenRequest } from '../api';

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
    setHasSubscription(false);
    setNotification(null);
    navigate('/');
  };

  const updateSubscriptionStatus = async () => {
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
  };

  useEffect(() => {
    if (isAuth) {
      updateSubscriptionStatus();
    }
  }, [isAuth]);

  useEffect(() => {
    if (!isAuth) return;

    const token = getAccessToken();
    const exp = getTokenExpiration(token);
    if (!exp) return;

    const refreshInMs = exp * 1000 - Date.now() - 30000;

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
  }, [isAuth]);

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
      setNotification('Сессия истекла, пожалуйста, войдите снова.');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [logout]);

  const login = (email: string) => {
    localStorage.setItem('isAuth', 'true');
    localStorage.setItem('userEmail', email);
    setIsAuth(true);
    setUserEmail(email);
    setNotification('Вы успешно вошли.');
    navigate('/profile');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuth,
        userEmail,
        hasSubscription,
        notification,
        setNotification,
        login,
        logout,
        updateSubscriptionStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
