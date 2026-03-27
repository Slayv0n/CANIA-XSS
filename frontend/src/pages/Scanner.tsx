import { useState , useEffect} from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Download, ReportReady } from '../assets/icons';
import CustomSelect from '../components/CustomSelect';

import { api } from '../api';

type ScanStatus = 'idle' | 'scanning' | 'ready';

export function Scanner() {
  const [url, setUrl] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [textIndex, setTextIndex] = useState(0);
  
  // Состояния для выбранных значений
  const [selectedAttack, setSelectedAttack] = useState('');
  const [selectedDepth, setSelectedDepth] = useState('');

  const [error, setError] = useState<string | null>(null);


  const scanTexts = [
    "проверяем код...",
    "ищем уязвимости...",
    "проверка может занять несколько минут..."
  ];

  const attackTypes = ['XSS', 'SQL Injections', 'CSRF', 'IDOR', 'Security Misconfiguration', 'Все типы'];
  const depthLevels = ['Низкая', 'Средняя', 'Высокая'];

  useEffect(() => {
    if (scanStatus !== 'scanning') return;

    const interval = setInterval(() => {
      setTextIndex((prevIndex) => (prevIndex + 1) % scanTexts.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [scanStatus]);

  //надо будет нормально условия отработать
  const startScan = async () => {
    setError(null);

    if (!url) {
        setError("Сначала введите URL сайта для проверки!");
        return;
    }
    if (!selectedAttack || !selectedDepth) {
        setError("Пожалуйста, выберите тип атаки и глубину проверки!");
        return;
    }
    if (!url.includes('.')) {
        setError("Пожалуйста, введите корректный URL сайта (например, example.com)!");
        return;
    }

    // 1. Словари для перевода текста в цифры (как ждет бэкенд)
    const attackMap: Record<string, number> = {
      'XSS': 1, 'SQL Injections': 2, 'Ddos': 3, 'Все типы': 1, 'CSRF': 1, 'IDOR': 1, 'Security Misconfiguration': 1
    };
    const depthMap: Record<string, number> = {
      'Низкая': 1, 'Средняя': 2, 'Высокая': 3
    };

    const token = localStorage.getItem('token');
    if (!token) {
        setError("Вы не авторизованы!");
        return;
    }

    try {
        setScanStatus('scanning');
        setTextIndex(0);

        const taskData = {
            host: url,
            typeOfAttacks: [attackMap[selectedAttack] || 1],
            depth: depthMap[selectedDepth] || 1
        };

        const result = await api.createTask(taskData, token);
        console.log("Задача создана! ID:", result.id);

        // Начинаем опрашивать бэкенд каждые 2 секунды (polling)
        const intervalId = setInterval(async () => {
            try {
                const checkTask = await api.getTask(result.id, token);
                console.log("Текущий статус задачи на сервере:", checkTask.status);
                
                // Если статус 5 (Completed) — останавливаем таймер и показываем отчет!
                if (checkTask.status === 5) {
                    setScanStatus('ready');
                    clearInterval(intervalId); // Выключаем опрос
                }
            } catch (e) {
                console.error("Не удалось проверить статус", e);
            }
        }, 2000); // 2000 мс = 2 секунды

    } catch (err: any) {
        setScanStatus('idle');
        setError(err.message || "Не удалось запустить сканирование");
    }
  };

  const finishScan = () => {
    if (scanStatus === 'scanning') {
      setScanStatus('ready');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 mb-40 md:p-20 relative z-10">
        <section className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold uppercase text-main-text mb-4">
                Проверьте ваш сайт на уязвимости
            </h1>
            <p className="text-brand-red text-xs uppercase font-bold tracking-wider">
                Мы не несем ответственность за использование инструмента в противоправных целях
            </p>
        </section>

        {error && (
          <div className="mb-6 bg-brand-red/10 border border-brand-red text-red-500 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <section className="flex flex-col md:flex-row gap-4 mb-4">
            <input
                type="text"
                placeholder="EXAMPLE.COM"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-card-bg border border-card-border p-4 rounded-sm text-main-text outline-none focus:border-brand-red"
            />
            <button
                onClick={startScan}
                className="bg-brand-red text-white px-10 py-4 font-bold uppercase rounded flex items-center justify-center gap-2 hover:bg-red-700 hover:transition-all cursor-pointer"
            >
                Проверить <span>→</span>
            </button>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {/* Селект для типа атаки */}
            <CustomSelect 
                value={selectedAttack}
                onChange={setSelectedAttack}
                options={attackTypes}
                placeholder="Тип атаки"
            />

            {/* Селект для глубины */}
            <CustomSelect 
                value={selectedDepth}
                onChange={setSelectedDepth}
                options={depthLevels}
                placeholder="Глубина атаки"
            />
        </section>

        {scanStatus !== 'idle' && (
            <div className="flex flex-col items-center justify-center py-12 min-h-62.5">
                {scanStatus === 'ready' ? (
                    <div className="animate-in zoom-in duration-300">
                        <ReportReady />
                    </div>
                ) : (
                    <>
                        <div className="mb-8 cursor-pointer" onClick={finishScan}>
                            <svg className="w-20 h-20 text-brand-red animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" strokeDasharray="45 20" />
                            </svg>
                        </div>
                        <div className="h-16 flex items-start justify-center overflow-hidden w-full text-center relative pointer-events-none">
                            <p key={textIndex} className="absolute animate-slide-text font-mono text-sm md:text-base text-desc-text">
                                {scanTexts[textIndex]}
                            </p>
                        </div>
                    </>
                )}
            </div>
        )}

        {scanStatus === 'ready' && (
        <div>
            <section className='flex justify-between items-center'>
                <h2 className='text-2xl'>Отчет по сайту ***</h2>
                <button className='flex items-center bg-brand-red py-6 px-16 rounded gap-2 cursor-pointer'>
                    Скачать <Download />
                </button>
            </section>

            <div className="mt-8 border border-card-border rounded-xl overflow-hidden bg-black/40 relative">
                <div className="flex justify-between items-center bg-white/5 px-6 py-3 border-b border-card-border text-xs md:text-sm font-mono text-desc-text">
                    <div className="flex-1 italic">*название файла*</div>
                    <div className="flex items-center gap-4 bg-black/20 px-4 py-1 rounded-full border border-card-border">
                        <button className="hover:text-white cursor-pointer">+</button>
                        <span className="text-main-text">100%</span>
                        <button className="hover:text-white cursor-pointer">—</button>
                    </div>
                    <div className="flex-1 flex justify-end">
                        <button className="hover:text-white cursor-pointer">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="h-125 md:h-175 p-8 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4 opacity-20">
                        <div className="h-4 bg-white/10 w-3/4 rounded"></div>
                        <div className="h-4 bg-white/10 w-full rounded"></div>
                        <div className="h-4 bg-white/10 w-5/6 rounded"></div>
                        <div className="h-4 bg-white/10 w-1/2 rounded"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-white/5 font-bold text-4xl md:text-6xl uppercase rotate-[-10deg] select-none">
                            CANIA REPORT PREVIEW
                        </p>
                    </div>
                </div>
            </div>
        </div>
        )}

      </main>

      <Footer />
    </div>
  );
}