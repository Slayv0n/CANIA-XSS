import React, { useState , useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer'; // Добавили футер
import {Download, ReportReady} from '../assets/icons';

export function Scanner({ onLogout, currentTheme, onThemeToggle, isAuth, onPricesClick }) {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  
  // Новые состояния
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle' | 'scanning' | 'ready'
  const [textIndex, setTextIndex] = useState(0);

  // Наш массив текстов
  const scanTexts =[
    "проверяем код...",
    "ищем уязвимости...",
    "проверка может занять несколько минут..."
  ];

  // Хук "Бесконечного цикла" для смены текста
  useEffect(() => {
    // Запускаем таймер только если статус 'scanning'
    if (scanStatus !== 'scanning') return;

    // setInterval запускает функцию каждые 3000 мс (3 сек)
    const interval = setInterval(() => {
      setTextIndex((prevIndex) => (prevIndex + 1) % scanTexts.length); // % не дает индексу выйти за пределы массива
    }, 3000);

    // Очистка таймера при остановке
    return () => clearInterval(interval);
  }, [scanStatus]);

  // Функция старта (вешаем на кнопку "Проверить")
  const startScan = () => {
   if (!url) {
    alert("Сначала введите URL сайта для проверки!");
    return;
  }
    setScanStatus('scanning');
    setTextIndex(0); // Начинаем с первого текста
  };

  // Функция финиша (вешаем на сам кружок)
  const finishScan = () => {
    if (scanStatus === 'scanning') {
      setScanStatus('ready');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Наш стандартный Хедер */}
      <Header 
        onLoginClick={() => {}} 
        currentTheme={currentTheme} 
        onThemeToggle={onThemeToggle} 
        isAuth={isAuth}
        onPricesClick={onPricesClick} 
      />

      {/* 2. Основная рабочая область */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-20 relative z-10">
        
        {/* Заголовок */}
        <section className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold uppercase text-main-text mb-4">
                Проверьте ваш сайт на уязвимости
            </h1>
            <p className="text-brand-red text-xs uppercase font-bold tracking-wider">
                Мы не несем ответственность за использование инструмента в противоправных целях
            </p>
        </section>

        {/* Секция ввода URL */}
        <section className="flex flex-col md:flex-row gap-4 mb-8">
            <input 
                type="text" 
                placeholder="EXAMPLE.COM"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-white/3 border border-card-border p-4 rounded-sm text-main-text outline-none focus:border-brand-red transition-colors"
            />
            <button 
                onClick={startScan}
                className="bg-brand-red text-white px-10 py-4 font-bold uppercase rounded flex items-center justify-center gap-2 hover:bg-red-700 transition-all cursor-pointer"
            >
                Проверить <span>→</span>
            </button>
        </section>

        {/* Секция выбора настроек */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <div className="flex flex-col gap-2">
                <select className="bg-white/3 border border-card-border p-4 rounded-sm text-desc-text outline-none appearance-none cursor-pointer hover:border-white/20">
                    <option>Тип атаки</option>
                    <option>XSS Reflected</option>
                    <option>XSS DOM</option>
                </select>
            </div>
            <div className="flex flex-col gap-2">
                <select className="bg-white/3 border border-card-border p-4 rounded-sm text-desc-text outline-none appearance-none cursor-pointer hover:border-white/20">
                    <option>Глубина атаки</option>
                    <option>Низкая</option>
                    <option>Средняя</option>
                    <option>Высокая</option>
                </select>
            </div>
        </section>

        {/* Секция загрузки/финиша */}
        {scanStatus !== 'idle' && (
            <div className="flex flex-col items-center justify-center py-12 min-h-62.5">
                
                {scanStatus === 'ready' ? (
                    // ФИНАЛ: Показываем только твой SVG, так как текст уже внутри него
                    <div className="animate-in zoom-in duration-300">
                        <ReportReady />
                    </div>
                ) : (
                    // В ПРОЦЕССЕ: Показываем кружок и меняющийся текст
                    <>
                        {/* Кружок загрузки (кликабельный для тестов) */}
                        <div className="mb-8 cursor-pointer" onClick={finishScan}>
                            <svg className="w-20 h-20 text-brand-red animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" strokeDasharray="45 20" />
                            </svg>
                        </div>

                        {/* Анимированный текст */}
                        <div className="h-16 flex items-start justify-center overflow-hidden w-full text-center relative pointer-events-none">
                            <p key={textIndex} className="absolute animate-slide-text font-mono text-sm md:text-base text-desc-text">
                                {scanTexts[textIndex]}
                            </p>
                        </div>
                    </>
                )}

            </div>
        )}


        <section className='flex justify-between items-center'>
            <h2 className='text-2xl'>Отчет по сайту ***</h2>
            <button className='flex items-center bg-brand-red py-6 px-16 rounded gap-2'>
                Скачать <Download />
            </button>
        </section>

        {/* Окно предпросмотра отчета */}
        <div className="mt-8 border border-card-border rounded-xl overflow-hidden bg-black/40 relative">
            
            {/* Панель инструментов окна (Toolbar) */}
            <div className="flex justify-between items-center bg-white/5 px-6 py-3 border-b border-card-border text-xs md:text-sm font-mono text-desc-text">
                
                {/* Лево: Название */}
                <div className="flex-1 italic">
                    *название файла*
                </div>

                {/* Центр: Управление масштабом */}
                <div className="flex items-center gap-4 bg-black/20 px-4 py-1 rounded-full border border-card-border">
                    <button className="hover:text-white cursor-pointer">+</button>
                    <span className="text-main-text">100%</span>
                    <button className="hover:text-white cursor-pointer">—</button>
                </div>

                {/* Право: Иконка расширения */}
                <div className="flex-1 flex justify-end">
                    <button className="hover:text-white cursor-pointer">
                        {/* Иконка "развернуть" (квадратик) */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Зона самого отчета */}
            <div className="h-125 md:h-175 p-8 overflow-y-auto custom-scrollbar">
                {/* Пока здесь пусто, но мы можем добавить "заглушку" текста */}
                <div className="space-y-4 opacity-20">
                    <div className="h-4 bg-white/10 w-3/4 rounded"></div>
                    <div className="h-4 bg-white/10 w-full rounded"></div>
                    <div className="h-4 bg-white/10 w-5/6 rounded"></div>
                    <div className="h-4 bg-white/10 w-1/2 rounded"></div>
                    <div className="h-4 bg-white/10 w-full rounded"></div>
                </div>
                
                {/* Текст по центру, если данных нет */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-white/5 font-bold text-4xl md:text-6xl uppercase rotate-[-10deg] select-none">
                        CANIA REPORT PREVIEW
                    </p>
                </div>
            </div>
        </div>

      </main>

      {/* 3. Наш стандартный Футер */}
      <Footer onPricesClick={onPricesClick}/>
    </div>
  );
}