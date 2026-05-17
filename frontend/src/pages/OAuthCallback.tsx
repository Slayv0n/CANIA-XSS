import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { setAccessToken, setRefreshToken } from '../api';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;

    const accessToken = searchParams.get('access_token');
    const rawRefresh = searchParams.get('refresh_token');
    const emailParam = searchParams.get('email');

    if (accessToken && rawRefresh) {
      hasProcessed.current = true;

      // Восстанавливаем плюсы в refresh token (если были заменены в URL)
      const refreshToken = rawRefresh.replace(/ /g, '+');

      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      
      // Если почта пришла в ссылке, декодируем её (на случай спецсимволов).
      // Если вдруг бэкенд почему-то её не передаст, используем наш старый фоллбэк.
      const userEmail = emailParam ? decodeURIComponent(emailParam) : 'Google User';

      // Авторизуем пользователя СРАЗУ с правильной почтой
      login(userEmail);

      // Мягко переходим в профиль, очищая токены из URL
      navigate('/profile', { replace: true });
    } else {
      // Если токенов нет — редирект на главную
      navigate('/', { replace: true });
    }
  }, [searchParams, login, navigate]);

  return null;
}