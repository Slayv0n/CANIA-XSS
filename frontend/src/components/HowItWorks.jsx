import React from 'react';

export default function HowItWorks() {
  const steps = [
    {
      title: "ВВОДИМ ССЫЛКУ, ВЫБИРАЕМ ТИП И ГЛУБИНУ АТАКИ",
      text: "Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices diam eget suspendisse. A duis nam sit id. Nullam sollicitudin.",
      marginClass: "md:mt-0" 
    },
    {
      title: "КАК-ТО ТАМ ПРОГА РАБОТАЕТ",
      text: "Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices diam eget suspendisse. A duis nam sit id. Nullam sollicitudin.",
      marginClass: "md:mt-32" 
    },
    {
      title: "ПОЛУЧАЕМ ПОДРОБНЫЙ ОТЧЕТ",
      text: "Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices diam eget suspendisse. A duis nam sit id. Nullam sollicitudin.",
      marginClass: "md:mt-64" 
    }
  ];

  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        
        <h2 className="text-4xl md:text-6xl font-bold uppercase mb-24 text-center text-main-text">
          Как это работает?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <div key={index} className={`flex flex-col ${step.marginClass}`}>
              
              <h3 className="text-xl md:text-2xl font-bold uppercase mb-8 leading-tight min-h-15 text-main-text">
                {step.title}
              </h3>
              
              <p className="text-sm text-desc-text leading-relaxed mb-8">
                {step.text}
              </p>

              {/* Линия теперь использует системный цвет границ */}
              <div className="w-full h-px bg-card-border"></div>
              
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}