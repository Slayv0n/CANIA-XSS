import { useState, useEffect } from 'react';
import { getAccessToken } from '../api'; // <-- Импортируем нашу функцию чтения куки

export const useCurrentUser = () => {
  const[email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ВМЕСТО localStorage.getItem('token') используем куки:
    const token = getAccessToken(); 
    
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [, payloadBase64] = token.split('.');
      // Безопасный декодинг JWT (как в api/index.ts)
      const payloadJson = decodeURIComponent(
        atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(payloadJson);
      setEmail(payload.email ?? payload.Email ?? payload.sub ?? null);
      setName(payload.name ?? payload.Name ?? null);
    } catch {
      // ignore malformed token
    }
    setLoading(false);
  },[]);
  
  return { email, name, loading };
}