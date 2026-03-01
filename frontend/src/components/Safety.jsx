import React from 'react';

export default function Safety({ onTryClick }) {
  const safetyItems = [
    {
      title: "ВВОДИМ ССЫЛКУ, ВЫБИРАЕМ ТИП И ГЛУБИНУ АТАКИ",
      text: "Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices diam eget suspendisse.",
      spanClass: "md:col-start-1 md:col-span-2" 
    },
    {
      title: "ВВОДИМ ССЫЛКУ, ВЫБИРАЕМ ТИП И ГЛУБИНУ АТАКИ",
      text: "Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices diam eget suspendisse.",
      spanClass: "md:col-start-2 md:col-span-2"
    },
    {
      title: "ВВОДИМ ССЫЛКУ, ВЫБИРАЕМ ТИП И ГЛУБИНУ АТАКИ",
      text: "Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices diam eget suspendisse.",
      spanClass: "md:col-start-1 md:col-span-2"
    }
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        
        <h2 className="text-4xl md:text-6xl font-bold uppercase mb-24 text-center text-main-text">
          Это безопасно?
        </h2>

        <div className="flex flex-col">
          {safetyItems.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 w-full">
              <div className={`
                grid grid-cols-1 md:grid-cols-2 gap-8 
                py-16 border-b border-card-border
                ${item.spanClass}
              `}>
                
                <h3 className="text-xl md:text-2xl font-bold uppercase leading-tight text-main-text">
                  {item.title}
                </h3>

                <p className="text-xs md:text-sm text-desc-text leading-relaxed self-end">
                  {item.text}
                </p>

              </div>
            </div>
          ))}
        </div>

        <div className="w-full flex justify-end mt-20">
          <button 
            onClick={onTryClick}
            className=" bg-brand-red text-white px-10 py-4 rounded-sm font-bold uppercase flex items-center gap-2 hover:bg-red-800 transition-all cursor-pointer group"
          >
            Попробовать 
            <span className="group-hover:translate-x-1 transition-transform">↗</span>
          </button>
        </div>

      </div>
    </section>
  );
}