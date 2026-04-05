import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ArrowUp } from '../assets/icons';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const { t } = useLanguage();
  const [openIndexes, setOpenIndexes] = React.useState<number[]>([]);

  const faqItems: FAQItem[] = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') }
  ];

  const toggleIndex = (index: number) => {
    setOpenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <section className="py-24 px-6 border-b border-b-light-red">
        <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold uppercase mb-12 text-center text-main-text">{t('faq.title')}</h2>
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
                        <ArrowUp className={`w-7 h-7 ml-4 transition-transform! duration-500 ${isOpen ? 'rotate-180' : ''}`}/>
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
