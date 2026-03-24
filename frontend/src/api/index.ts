const API_BASE = '/api';

export interface LoginRequest {
  email: string;
  password: string;
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
  id: string;
  email: string;
  token: string;
}

export const api = {
  // Регистрация
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

  // Логин
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

  // Получение профиля
  async getProfile(token: string): Promise<User> {
    const response = await fetch(`${API_BASE}/users/account`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }
    
    return response.json();
  },
};
