import React from 'react';
import {FirstVector, SecondVector} from '../assets/icons/index.js';

export default function HowItWorks() {
  const steps = [
    {
      title: "Задайте цели проверки",
      text: `Вставьте URL вашего сайта. Выберите уровень сканирования (быстрый/глубокий) и
      выберите тип атаки (например, DOM-based, reflected, stored).`,
      marginClass: "md:mt-0"
    },
    {
      title: "Запустите поиск уязвимостей",
      text: `Наша AI-система эмулирует поведение злоумышленника, отправляя тысячи безопасных тестовых
      запросов. Алгоритм анализирует ответы сервера в реальном времени, выявляя даже скрытые векторы атак.`,
      marginClass: "md:mt-32"
    },
    {
      title: "Изучите результаты аудита",
      text: `Система формирует структурированный отчет с классификацией найденных проблем по уровню риска
      (Critical, High, Medium). Для каждой уязвимости предоставляется доказательство концепции (PoC) и шаги по устранению.`,
      marginClass: "md:mt-64"
    }
  ];

  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">

        <h2 className="text-4xl md:text-6xl font-bold uppercase mb-8 text-center text-main-text">
          Как работает CANIA?
        </h2>
        <h3 className='text-center mb-20'>Автоматизированный поиск уязвимостей с помощью ИИ: от настройки до готового отчета.</h3>

        {/* Контейнер с relative для позиционирования векторов */}
        <div className="relative">
          
          {/* Сетка с колонками */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <div key={index} className={`flex flex-col ${step.marginClass}`}>

                <h3 className="text-xl md:text-2xl font-bold uppercase mb-8 leading-tight min-h-15 text-main-text">
                  {step.title}
                </h3>

                <p className="text-sm text-desc-text leading-relaxed mb-8">
                  {step.text}
                </p>

                <div className="w-full h-px bg-card-border"></div>

              </div>
            ))}
          </div>

          {/* Первый вектор - между 1 и 2 колонкой (под текстом первой колонки) */}
          <div className="hidden md:block absolute top-60 left-[15%]">
            <FirstVector className="w-50 h-auto" />
          </div>

          {/* Второй вектор - между 2 и 3 колонкой (над title третьей колонки) */}
          <div className="hidden md:block absolute top-30 left-[70%]">
            <SecondVector className="w-50 h-auto" />
          </div>

        </div>

      </div>
    </section>
  );
}