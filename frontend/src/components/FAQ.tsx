import React from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  // Указываем TS, что тут будет массив чисел: <number[]>
  const [openIndexes, setOpenIndexes] = React.useState<number[]>([]);

  const faqItems: FAQItem[] = [
    { question: "КАК ЭТО РАБОТАЕТ?", answer: "Lorem ipsum dolor sit amet consectetur..." },
    { question: "ЭТО БЕЗОПАСНО?", answer: "Commodo lorem ultrices id ultrices diam eget..." },
    { question: "СКОЛЬКО СТОИТ?", answer: "A duis nam sit id. Nullam sollicitudин." }
  ];

  const toggleIndex = (index: number) => {
    setOpenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <section className="py-24 px-6 border-b border-b-light-red">
        <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold uppercase mb-12 text-center text-main-text">FAQ</h2>
        <div className="flex flex-col">
            {faqItems.map((item, index) => {
              const isOpen = openIndexes.includes(index);
              return (
                <div key={index} className={`border-b border-light-red ${index === 0 ? 'border-t border-t-light-red' : ''}`}>
                    <button
                        onClick={() => toggleIndex(index)}
                        className="w-full py-8 flex justify-between items-center text-left text-main-text hover:text-brand-red transition-colors duration-300 group cursor-pointer"
                    >
                        <span className="text-xl font-bold uppercase">{item.question}</span>
                        <span className={`text-3xl ml-4 transition-transform! duration-500 ${isOpen ? 'rotate-180' : ''}`}>
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 10L14 20L24 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                    </button>
                    <div
                        className={`grid transition-all! duration-500 ease-in-out ${
                            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                    >
                        <div className="overflow-hidden">
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