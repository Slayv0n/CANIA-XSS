import React from 'react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = React.useState(null);  
  
  const faqItems =[
    { question: "КАК ЭТО РАБОТАЕТ?", answer: "Lorem ipsum dolor sit amet consectetur..." },
    { question: "ЭТО БЕЗОПАСНО?", answer: "Commodo lorem ultrices id ultrices diam eget..." },
    { question: "СКОЛЬКО СТОИТ?", answer: "A duis nam sit id. Nullam sollicitudin." }
  ];

  return (
    <section className="py-24 px-6 border-t border-card-border transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
        
        <h2 className="text-4xl font-bold uppercase mb-12 text-center text-main-text">FAQ</h2>

        <div className="flex flex-col">
            {faqItems.map((item, index) => {
              // Для удобства вынесем проверку в переменную
              const isOpen = openIndex === index;

              return (
                <div key={index} className="border-b border-card-border">
                    
                    <button 
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                        className="w-full py-8 flex justify-between items-center text-left text-main-text hover:text-brand-red transition-colors group cursor-pointer"
                    >
                        <span className="text-xl font-bold uppercase">{item.question}</span>
                        {/* Добавил !transition-transform, чтобы стрелочка крутилась плавно и не перебивалась глобальным CSS */}
                        <span className={`text-3xl ml-4 transition-transform! duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 10L14 20L24 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                    </button>

                    {/* === МАГИЯ АНИМАЦИИ (Без удаления из DOM) === */}
                    <div 
                        className={`grid transition-all! duration-300 ease-in-out ${
                            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                    >
                        {/* overflow-hidden обязателен, чтобы текст обрезался при сжатии grid */}
                        <div className="overflow-hidden">
                            {/* Тот же самый ответ, но теперь он внутри grid-анимации */}
                            <div className="pb-8 text-desc-text text-lg leading-relaxed">
                                {item.answer}
                            </div>
                        </div>
                    </div>

                </div>
              );
            })}
        </div>

        </div>
    </section>
  );
}