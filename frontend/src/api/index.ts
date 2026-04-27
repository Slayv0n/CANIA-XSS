const API_BASE = '/api';
const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

export interface Tariff {
  name: string;
  description: string;
  cost: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TaskItem {
  id: string;
  host: string;
  status: number;
  createdTime: string;
  reportContent?: string;
}

export interface CreateTaskRequest {
  host: string;
  typeOfAttacks: number[];
  depth: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  status: number;
  version: number;
}

export interface LoginResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setAccessToken = (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token);
export const setRefreshToken = (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token);
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export async function refreshTokenRequest(): Promise<boolean> {
  return refreshToken();
}

export function getTokenExpiration(accessToken: string | null): number | null {
  if (!accessToken) return null;

  try {
    const [, payloadBase64] = accessToken.split('.');
    if (!payloadBase64) return null;

    const payloadJson = decodeURIComponent(
      atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    const payload = JSON.parse(payloadJson);
    if (payload.exp && typeof payload.exp === 'number') {
      return payload.exp;
    }
    return null;
  } catch {
    return null;
  }
}

async function refreshToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const resp = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!resp.ok) {
    clearTokens();
    return false;
  }

  const data = await resp.json();
  if (data?.accessToken && data?.refreshToken) {
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return true;
  }

  clearTokens();
  return false;
}

async function authFetch(input: RequestInfo, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const token = getAccessToken();

  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // JSON default
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 && attempt === 0) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return authFetch(input, init, 1);
    }
    clearTokens();
    window.dispatchEvent(new Event('auth-expired'));
    throw new Error('Unauthorized');
  }

  if (response.status === 401) {
    clearTokens();
    window.dispatchEvent(new Event('auth-expired'));
    throw new Error('Unauthorized');
  }

  return response;
}

export const api = {
  async updatePassword(password: string, token?: string) {
    const response = await authFetch(`${API_BASE}/passwords/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) throw new Error('Ошибка смены пароля');
  },

  async updateEmail(email: string, token?: string) {
    const response = await authFetch(`${API_BASE}/users/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) throw new Error('Ошибка смены почты');
    return response.json();
  },

  async resetPasswordRequest(email: string) {
    const response = await fetch(`${API_BASE}/passwords/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) throw new Error('Ошибка запроса на сброс');
  },

  async verifyResetToken(token: string, email: string) {
    const response = await fetch(`${API_BASE}/passwords/reset/${token}/${email}`, {
      method: 'POST',
    });

    const isValid = await response.json();
    if (!isValid) throw new Error('Неверный или просроченный код');
    return isValid;
  },

  async completeReset(email: string, token: string, newPassword: string) {
    const response = await fetch(`${API_BASE}/passwords/reset/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword }),
    });

    if (!response.ok) throw new Error('Не удалось сменить пароль');
  },

  async buySubscription(tariff: Tariff, token?: string) {
    const response1 = await authFetch(`${API_BASE}/subscribes/subscribe`, {
      method: 'POST',
      body: JSON.stringify(tariff),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    let response = response1;

    if (response.status === 400) {
      response = await authFetch(`${API_BASE}/subscribes/update`, {
        method: 'PUT',
        body: JSON.stringify(tariff),
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    }

    if (!response.ok) throw new Error('Ошибка оплаты');
    return response.json();
  },

  async getMySubscription(token?: string): Promise<Tariff | null> {
    try {
      const response = await authFetch(`${API_BASE}/subscribes/account`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        // If endpoint missing (404) or other error, return null as stub
        if (response.status === 404) return null;
        throw new Error('Ошибка получения подписки');
      }
      const text = await response.text();
      if (!text || text === '"Data is empty"') return null;
      return JSON.parse(text);
    } catch (e) {
      // Network or other errors fallback to null
      return null;
    }
  },

  async cancelSubscription(token?: string) {
    const response = await authFetch(`${API_BASE}/subscribes/unscribe`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) throw new Error('Ошибка отмены подписки');
  },

  // Временная заглушка: если бекенд‑эндпоинт ещё не реализован, функция возвращает пустой массив
async getMyTasks(token?: string): Promise<TaskItem[]> {
    try {
      const response = await authFetch(`${API_BASE}/task/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        // If endpoint missing, return empty array
        if (response.status === 404) return [];
        throw new Error('Ошибка получения отчетов');
      }
      return response.json();
    } catch (e) {
      // Network or other errors fallback to empty list
      return [];
    }
  },

  async register(data: RegisterRequest): Promise<User> {
    const response = await fetch(`${API_BASE}/users/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return response.json();
  },

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Неверный email или пароль');
      }
      const error = await response.text();
      throw new Error(error || 'Ошибка сети');
    }

    return response.json();
  },

  async getProfile(token?: string): Promise<User> {
    const response = await authFetch(`${API_BASE}/users/account`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return response.json();
  },

  async createTask(data: CreateTaskRequest, token?: string) {
    const response = await authFetch(`${API_BASE}/task/create`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Ошибка создания задачи');
    }

    return response.json();
  },

  // async getTask(taskId: string, token?: string) {
  //   const response = await authFetch(`${API_BASE}/task/${taskId}`, {
  //     headers: token ? { Authorization: `Bearer ${token}` } : {},
  //   });

  //   if (!response.ok) throw new Error('Ошибка получения статуса');
  //   return response.json();
  // },

  async getTask(taskId: string, token: string) {
    try {
      const response = await authFetch(`${API_BASE}/task/${taskId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        if (response.status === 404) return { taskId, status: 5, reportContent: '' }; // сразу готово
        throw new Error('Ошибка получения задачи');
      }
      return await response.json();
    } catch {
      return { taskId, status: 5, reportContent: '' };
    }
  },

  async deleteTask(taskId: string, token?: string) {
    const response = await authFetch(`${API_BASE}/task/cancel/${taskId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) throw new Error('Ошибка удаления задачи');
  },
};

