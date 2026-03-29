const API_BASE = '/api';

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
  // Смена пароля
  async updatePassword(password: string, token: string) {
    const response = await fetch(`${API_BASE}/passwords/update`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      // Отправляем объект с полем password, как ждет бэкенд
      body: JSON.stringify({ password }) 
    });
    
    if (!response.ok) throw new Error('Ошибка смены пароля');
  },

  // Смена почты
  async updateEmail(email: string, token: string) {
    const response = await fetch(`${API_BASE}/users/update`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      // Отправляем объект { email: "..." }
      body: JSON.stringify({ email }) 
    });
    
    if (!response.ok) throw new Error('Ошибка смены почты');
    return response.json();
  },

  // Запрос на сброс пароля (генерация токена)
  async resetPasswordRequest(email: string) {
    const response = await fetch(`${API_BASE}/passwords/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!response.ok) throw new Error('Ошибка запроса на сброс');
  },

  // Проверка токена и установка нового пароля
  // Проверка токена сброса пароля
  async verifyResetToken(token: string, email: string) {
    const response = await fetch(`${API_BASE}/passwords/reset/${token}/${email}`, {
      method: 'POST'
    });
    
    // Бэкенд возвращает true или false
    const isValid = await response.json();
    if (!isValid) throw new Error('Неверный или просроченный код');
    return isValid;
  },

  async completeReset(email: string, token: string, newPassword: string) {
    const response = await fetch(`${API_BASE}/passwords/reset/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email, 
        token: token, 
        newPassword: newPassword 
      })
    });
    if (!response.ok) throw new Error('Не удалось сменить пароль');
  },

  // Покупка подписки (Умный метод: создает или обновляет)
  async buySubscription(tariff: Tariff, token: string) {
    // 1. Сначала пробуем просто СОЗДАТЬ подписку (POST)
    let response = await fetch(`${API_BASE}/subscribes/subscribe`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(tariff)
    });
    
    // 2. Если бэкенд выдал 400 (Bad Request), значит подписка УЖЕ ЕСТЬ.
    // Тогда мы делаем запрос на ОБНОВЛЕНИЕ (PUT)
    if (response.status === 400) {
      response = await fetch(`${API_BASE}/subscribes/update`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(tariff)
      });
    }

    if (!response.ok) throw new Error('Ошибка оплаты');
    return response.json();
  },

  // Получение текущей подписки
  async getMySubscription(token: string): Promise<Tariff | null> {
    const response = await fetch(`${API_BASE}/subscribes/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Ошибка получения подписки');
    
    // Читаем текст ответа. Если он пустой, значит подписки нет (null)
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  },

  // [DEV] Удаление подписки
  async cancelSubscription(token: string) {
    const response = await fetch(`${API_BASE}/subscribes/unscribe`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Ошибка отмены подписки');
    // Бэкенд возвращает Results.Ok() без тела, поэтому json() не вызываем
  },

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

  async deleteTask (taskId: string, token: string) {
    const response = await fetch(`${API_BASE}/task/cancel/${taskId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}` 
      },
    });
    
    if (!response.ok) throw new Error('Ошибка удаления задачи');
  }
};
