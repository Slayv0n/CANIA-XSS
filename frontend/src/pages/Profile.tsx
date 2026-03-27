import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { api, TaskItem } from '../api';
import { useAuth } from '../context/AppContext';

export function Profile() {
  // 1. Состояние для списка отчетов
  const [reports, setReports] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { userEmail } = useAuth();

  const handleDelete = async (taskId: string) => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const deleteStatus = await api.deleteTask(taskId, token);
    setReports(reports.filter(report => report.id !== taskId))
    
  } catch (err) {
    console.error("Ошибка удаления отчета:", err);
  }
};

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
                                className="w-full flex justify-between items-center p-6 bg-card-bg border border-card-border rounded-xl hover:border-brand-red hover:transition-colors group cursor-pointer"
                            >
                                {/* ЛЕВАЯ ЧАСТЬ: Текст */}
                                <div className="flex flex-col items-start gap-1 text-left">
                                    <span className="text-main-text font-medium uppercase text-sm">
                                        Отчет по сайту: {report.host}
                                    </span>
                                    <span className={`text-[10px] uppercase font-bold ${report.status === 5 ? 'text-green-500' : 'text-brand-red'}`}>
                                        {report.status === 5 ? "Готов" : "В процессе"}
                                    </span>
                                </div>

                                {/* ПРАВАЯ ЧАСТЬ: Крестик и Стрелка вместе */}
                                <div className="flex items-center gap-6"> 
                                    {/* Кнопка удаления */}
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(report.id);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-full text-desc-text hover:text-brand-red transition-all cursor-pointer"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 6L6 18M6 6l12 12"/>
                                        </svg>
                                    </div>

                                    {/* Иконка стрелочки */}
                                    <svg className="w-6 h-6 text-desc-text group-hover:text-brand-red transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
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
                    <div className="text-desc-text text-sm leading-relaxed flex flex-col gap-2">
                        <p className="text-main-text font-bold">Аккаунт: {userEmail}</p>
                        <p>Статус: <span className="text-brand-red">Active</span></p>
                        {/* Тут потом добавим данные из SubscribeService */}
                    </div>
                </div>
            </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}