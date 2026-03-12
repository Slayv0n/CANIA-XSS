import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';

export function Profile({ onLogout, currentTheme, onThemeToggle, isAuth, onPricesClick }) {
  const navigate = useNavigate();

  // Фейковый массив отчетов для верстки
  const reports =[1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="flex flex-col min-h-screen bg-main-bg">
      
      {/* Хедер. Обрати внимание, передаем navigate('/scanner') для Функционала */}
      <Header 
        onLoginClick={() => {}} 
        currentTheme={currentTheme} 
        onThemeToggle={onThemeToggle} 
        isAuth={isAuth} 
        onProfileClick={() => {}} 
        onFeatureClick={() => navigate('/scanner')} // НОВЫЙ ПРОПС!
        onPricesClick={onPricesClick}        
      />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:py-20 relative z-10">
        
        {/* Сетка: Отчеты слева (2 колонки), Подписка справа (1 колонка) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            {/* ЛЕВАЯ ЧАСТЬ: ВАШИ ОТЧЕТЫ */}
            <div className="md:col-span-2 flex flex-col">
                <h1 className="text-3xl font-bold uppercase text-main-text mb-8">
                    Ваши отчеты
                </h1>
                
                <div className="flex flex-col gap-4">
                    {reports.map((item, index) => (
                        <button 
                            key={index}
                            className="flex justify-between items-center p-6 bg-card-bg border border-card-border rounded-xl hover:border-brand-red transition-colors group cursor-pointer"
                        >
                            <span className="text-main-text font-medium uppercase text-sm">
                                Отчет по такому-то сайту
                            </span>
                            {/* Иконка стрелочки */}
                            <svg className="w-6 h-6 text-desc-text group-hover:text-brand-red transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                    ))}
                </div>
            </div>

            {/* ПРАВАЯ ЧАСТЬ: ПОДПИСКА */}
            <div className="md:col-span-1 flex flex-col">
                <div className="bg-card-bg border border-card-border rounded-xl p-8 min-h-125">
                    <h2 className="text-2xl font-bold uppercase text-main-text mb-12">
                        Подписка
                    </h2>
                    
                    <div className="text-desc-text text-sm leading-relaxed flex flex-col gap-2">
                        <p>в целом вся инфа о подписке</p>
                        <p>когда истекает</p>
                        <p>лимиты</p>
                        <p className="mt-4">*когда тарифы появятся</p>
                    </div>

                    {/* Кнопка выхода (перенесли сюда из старого сайдбара) */}
                    <button 
                        onClick={onLogout}
                        className="mt-20 text-brand-red font-bold uppercase hover:underline cursor-pointer"
                    >
                        Выйти из аккаунта
                    </button>
                </div>
            </div>

        </div>
      </main>

      <Footer 
        onPricesClick={onPricesClick}
        currentTheme={currentTheme}
        onThemeToggle={onThemeToggle}
      />
    </div>
  );
}