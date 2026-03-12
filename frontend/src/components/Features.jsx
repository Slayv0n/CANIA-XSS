import React from 'react';
import {Forward, Ai, File, Search, Shield} from '../assets/icons/index.js'
export default function Features({ onTryClick }) {
  const features = [
    {
      title: "Универсальный сканер уязвимостей",
      text: `CANIA — это автоматизированный инструмент для аудита безопасности веб-приложений.
      Он заменяет часы ручного тестирования минутами работы умного алгоритма.`,
      icon: <Search className="h-8 w-8 mb-4" />,
      iconsClasses: "flex flex-row-reverse",
      containerClasses: "flex flex-col h-full justify-between",
    },
    {
      title: "Широкий спектр угроз",
      text: `Мы не ограничиваемся только XSS. Система ищет SQL-инъекции, CSRF, IDOR, проблемы конфигурации
      и другие уязвимости из списка OWASP Top 10.`,
      icon: <Shield className="h-8 w-8 text-brand-red mb-4" />,
      iconsClasses: "flex flex-row-reverse justify-between",
      containerClasses: "flex flex-col-reverse h-full justify-between",
    },
    {
      title: "Powered by AI",
      text: `Использует машинное обучение для эмуляции реальных атак хакеров.
      Алгоритм адаптируется под структуру вашего сайта, находя скрытые дыры, которые пропускают обычные сканеры.`,
      icon: <Ai className="h-8 w-8 text-brand-red mb-4" />,
      iconsClasses: "flex flex-row-reverse justify-between",
      containerClasses: "flex flex-col h-full justify-between",
    },
    {
      title: "Понятный отчет",
      text: `На выходе вы получаете структурированный PDF/JSON отчет с уровнем риска,
      примерами эксплуатации и готовыми рекомендациями по исправлению кода для разработчиков`,
      icon: <File className="h-8 w-8 text-brand-red mb-4" />,
      iconsClasses: "flex flex-row-reverse justify-between",
      containerClasses: "flex flex-col-reverse h-full justify-between",
    }
  ];

  return (
    <section className="bg-transparent py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        <h2 className="text-4xl md:text-5xl font-bold uppercase mb-6 text-center text-main-text">
          Что это такое?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16 auto-rows-[1fr]">
          {features.map((item, index) => {
            
            let gridClasses = "md:col-span-1"; 

            if (index === 0) {
              gridClasses = "md:row-span-2";
            } else if (index === 3) {
              gridClasses = "md:col-span-2";
            }

            return (
              <div
                key={index}
                className={`
                  border rounded-3xl p-8 flex flex-col justify-between
                  border-light-red min-h-60
                  ${gridClasses}
                `}
              >
                <div className={item.containerClasses}>
                  <div className={item.iconsClasses}>
                    {item.icon}
                    <h3 className="text-xl font-bold uppercase mb-4 text-main-text">{item.title}</h3>
                  </div>
                  <p className="text-desc-text leading-relaxed text-sm">
                    {item.text}
                  </p>
                </div>

              </div>
            );
          })}
        </div>

        <div className="w-full flex justify-end">
            <button
              onClick={onTryClick}
              className="bg-transparent border-brand-red border-2 text-main-text px-10 py-4 rounded-4xl font-bold uppercase flex items-center gap-2 hover:bg-brand-red hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex gap-2 place-items-center text-lg">Попробовать бесплатно <Forward className='h-6'/> </span>
            </button>
        </div>

      </div>
    </section>
  );
}