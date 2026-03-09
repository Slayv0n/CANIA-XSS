import React from 'react';
import {Forward} from '../assets/icons/index.js'
export default function Features({ onTryClick }) {
  const features = [
    {
      title: "ЧТО ЭТО ТАКОЕ? (Left)",
      text: "Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices diam eget suspendisse. A duis nam sit id.",
    },
    {
      title: "ЧТО ЭТО ТАКОЕ? (Mid Top)",
      text: "Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices diam eget suspendisse."
    },
    {
      title: "ЧТО ЭТО ТАКОЕ? (Right Top)",
      text: "Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices diam eget suspendisse."
    },
    {
      title: "ЧТО ЭТО ТАКОЕ? (Bottom Wide)",
      text: "Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices diam eget suspendisse. A duis nam sit id. Nullam sollicitudin commodo purus.",
    }
  ];

  return (
    <section className="bg-transparent py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        <h2 className="text-4xl md:text-5xl font-bold uppercase mb-6 text-center text-main-text">
          Что это такое?
        </h2>
        
        <p className="text-desc-text text-center max-w-2xl mb-16 leading-relaxed">
          Lorem ipsum dolor sit amet consectetur. Commodo lorem ultrices id ultrices.
        </p>

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
                  border border-card-border rounded-3xl p-8 flex flex-col justify-between 
                  hover:border-brand-red transition-colors duration-300 min-h-75
                  ${gridClasses}
                `}
              >
                <div>
                  <h3 className="text-xl font-bold uppercase mb-4 text-main-text">{item.title}</h3>
                  <p className="text-desc-text leading-relaxed text-sm">
                    {item.text}
                  </p>
                </div>
                
                <h3 className="text-lg font-bold uppercase mt-6 opacity-50 text-main-text">{item.title}</h3>
              </div>
            );
          })}
        </div>

        <div className="w-full flex justify-end">
            <button 
              onClick={onTryClick}
              className="bg-transparent border-brand-red border-2 text-white px-10 py-4 rounded-4xl font-bold uppercase flex items-center gap-2 hover:bg-red-800 transition-colors cursor-pointer"
            >
              <span className="flex gap-2 place-items-center text-lg">Попробовать бесплатно <Forward className='h-6'/> </span>
            </button>
        </div>

      </div>
    </section>
  );
}