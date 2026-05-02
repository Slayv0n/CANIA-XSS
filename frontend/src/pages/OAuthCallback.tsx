import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setAccessToken, setRefreshToken } from '../api';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;

    const accessToken = searchParams.get('access_token');
    const rawRefresh = searchParams.get('refresh_token');

    if (accessToken && rawRefresh) {
      hasProcessed.current = true;

      // Восстанавливаем плюсы в refresh token (если были заменены в URL)
      const refreshToken = rawRefresh.replace(/ /g, '+');

      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      login('Google User');

      // Заменяем историю, чтобы токены не оставались в URL
      window.location.href = '/profile';
    } else {
      // Если токенов нет — редирект на главную
      window.location.href = '/';
    }
  }, [searchParams, login]);

  return null; // Показывать ничего не нужно
}