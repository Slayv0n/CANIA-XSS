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

    if (accessToken && rawRefresh) {
      hasProcessed.current = true;

      // Восстанавливаем плюсы в refresh token (если были заменены в URL)
      const refreshToken = rawRefresh.replace(/ /g, '+');

      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      
      // Авторизуем пользователя (эта функция сама подтянет профиль через /api/users)
      login('Google User');

      // Мягко переходим в профиль, НЕ сбрасывая состояние приложения!
      navigate('/profile', { replace: true });
    } else {
      // Если токенов нет — редирект на главную
      navigate('/', { replace: true });
    }
  }, [searchParams, login, navigate]);

  return null; // Показывать ничего не нужно
}