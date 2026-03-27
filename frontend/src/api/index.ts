const API_BASE = '/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TaskItem {
  id: string;
  host: string;
  status: number;
  createdTime: string;
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
  accessToken: string; // исправлено
  refreshToken: string; // добавлено
}

export const api = {
  async getMyTasks(token: string): Promise<TaskItem[]> {
    const response = await fetch(`${API_BASE}/task/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Ошибка получения отчетов');
    return response.json();
  },

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

  // Создание задачи на сканирование
  async createTask(data: CreateTaskRequest, token: string) {
    const response = await fetch(`${API_BASE}/task/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Передаем токен для проверки в Gateway!
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Ошибка создания задачи');
    }
    
    return response.json();
  },

  // Получение статуса задачи
  async getTask(taskId: string, token: string) {
    const response = await fetch(`${API_BASE}/task/${taskId}`, {
      headers: { 
        'Authorization': `Bearer ${token}` 
      },
    });
    
    if (!response.ok) throw new Error('Ошибка получения статуса');
    return response.json();
  },
};
