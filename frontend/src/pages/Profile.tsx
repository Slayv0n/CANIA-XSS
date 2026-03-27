import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { api, TaskItem } from '../api';

export function Profile() {
  // 1. Состояние для списка отчетов
  const [reports, setReports] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Загружаем данные при входе на страницу
  useEffect(() => {
    const token = localStorage.getItem('token');
    // Если токена нет или он подозрительно короткий - даже не делаем запрос
    if (token && token.length > 50) { 
      api.getMyTasks(token)
        .then((data) => {
          setReports(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Ошибка загрузки профиля:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
      console.warn("Запрос не отправлен: токен отсутствует");
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-main-bg">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            <div className="md:col-span-2 flex flex-col">
                <h1 className="text-3xl font-bold uppercase text-main-text mb-8">
                    Ваши отчеты
                </h1>
                
                <div className="flex flex-col gap-4">
                    {loading ? (
                        <p className="text-desc-text animate-pulse">Загрузка отчетов...</p>
                    ) : reports.length > 0 ? (
                        reports.map((report) => (
                            <button 
                                key={report.id}
                                className="flex justify-between items-center p-6 bg-card-bg border border-card-border rounded-xl hover:border-brand-red transition-colors group cursor-pointer"
                            >
                                <div className="flex flex-col items-start gap-1">
                                    <span className="text-main-text font-medium uppercase text-sm">
                                        Отчет по сайту: {report.host}
                                    </span>
                                    <span className="text-[10px] text-brand-red uppercase font-bold">
                                        {report.status === 5 ? "Готов" : "В процессе"}
                                    </span>
                                </div>
                                <svg className="w-6 h-6 text-desc-text group-hover:text-brand-red transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </button>
                        ))
                    ) : (
                        <div className="p-10 border border-dashed border-card-border rounded-xl text-center">
                            <p className="text-desc-text">У вас пока нет созданных отчетов.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="md:col-span-1 flex flex-col">
                <div className="bg-card-bg border border-card-border rounded-xl p-8 min-h-125">
                    <h2 className="text-2xl font-bold uppercase text-main-text mb-12">
                        Подписка
                    </h2>
                    
                    <div className="text-desc-text text-sm leading-relaxed flex flex-col gap-2">
                        <p className="font-bold text-main-text">Бесплатный тариф</p>
                        <p>Доступно: 3 проверки в день</p>
                        <p className="mt-4 text-xs opacity-50">*Информация о тарифах подгрузится автоматически после настройки сервиса подписок.</p>
                    </div>
                </div>
            </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}