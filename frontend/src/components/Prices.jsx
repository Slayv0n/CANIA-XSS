import React from 'react';
import { GlowSpot } from '../assets/icons'; 

export default function Pricing({ isModal, onClose }) {
  const plans =[
    {
      id: '1-month',
      name: '1 месяц',
      desc: 'Для тестов, разовых проверок',
      price: '44 900 ₽',
      oldPrice: null,
      pricePerMonth: null,
      period: '/месяц',
      isPopular: false,
      features:['Безграничное количество запросов', 'Приоритетная обработка', 'Храним все отчеты']
    },
    {
      id: '6-months',
      name: '6 месяцев',
      desc: 'Для регулярного использования',
      price: '199 000 ₽',
      oldPrice: '-70 400 ₽',
      pricePerMonth: '33 166 ₽',
      period: '/месяц',
      isPopular: true,
      features:['Безграничное количество запросов', 'Приоритетная обработка', 'Храним все отчеты']
    },
    {
      id: '1-year',
      name: 'Год',
      desc: 'Для команд, максимальная выгода',
      price: '349 000 ₽',
      oldPrice: '-189 800 ₽',
      pricePerMonth: '29 080 ₽',
      period: '/месяц',
      isPopular: false,
      features:['Безграничное количество запросов', 'Приоритетная обработка', 'Храним все отчеты']
    }
  ];

  if (isModal) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto " onClick={onClose}>
        <div className="relative w-full max-w-7xl my-auto" onClick={(e) => e.stopPropagation()}>
           {/* Кнопка закрытия модалки */}
           <button onClick={onClose} className="absolute -top-12 right-0 text-white hover:text-brand-red text-4xl">&times;</button>
           
           {/* Сама секция, но без паддингов сверху/снизу, чтобы влезть в окно */}
           <section className="bg-main-bg border border-white/10 rounded-4xl p-10 relative z-10 transition-colors duration-300">
             <h2 className="text-4xl md:text-5xl font-bold uppercase mb-16 text-center text-main-text">
          Тарифы
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            // flex-col и justify-end прижимают карточку к низу. 
            // pt-8 создает "воздух" сверху, куда карточка будет растягиваться при наведении.
            <div key={plan.id} className="relative group h-full flex flex-col justify-end">

              {plan.isPopular && (
                <GlowSpot
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[130%] opacity-40 group-hover:opacity-100 transition-opacity! duration-500 pointer-events-none z-0 light:opacity-60 light:group-hover:opacity-100"
                />
              )}

              {/*
                  МАГИЯ ЗДЕСЬ:
                  1. !transition-all (с восклицательным знаком)
                  2. pb-14 (вместо pb-10, чтобы щиты не липли к низу)
              */}
              <div className="bg-card-bg w-full border border-card-border group-hover:border-brand-red/60 rounded-4xl p-8 md:p-10 flex flex-col relative z-10 transition-all! duration-500 ease-out h-full min-h-145 origin-bottom group-hover:scale-[1.04] group-hover:shadow-[0_0_60px_rgba(195,28,26,0.25)]">

                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-brand-red text-white text-xs font-bold uppercase px-6 py-2 rounded-tr-4xl rounded-bl-2xl">
                    Самый популярный
                  </div>
                )}

                <h3 className="text-brand-red text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-desc-text text-sm mb-8">{plan.desc}</p>

                <div className="mb-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-4xl font-bold text-main-text leading-none">{plan.price}</span>
                    {plan.oldPrice && (
                      <span className="text-desc-text text-xs font-mono mt-1 opacity-60 line-through">
                        {plan.oldPrice}
                      </span>
                    )}
                    {!plan.pricePerMonth && (
                      <span className="text-desc-text text-sm self-end pb-1">{plan.period}</span>
                    )}
                  </div>

                  {plan.pricePerMonth && (
                    <div className="flex items-center gap-2 text-desc-text text-sm font-mono mt-4">
                       <span className="text-desc-text">{plan.pricePerMonth}</span>
                       <span>{plan.period}</span>
                    </div>
                  )}
                </div>

                <button
                    className={`w-full py-4 rounded-full font-bold uppercase tracking-wider transition-all! duration-300 mb-10 ${
                        plan.isPopular
                        ? 'bg-brand-red text-white hover:bg-red-700 shadow-[0_0_20px_rgba(195,28,26,0.4)]'
                        : 'bg-transparent border border-card-border text-main-text hover:border-brand-red hover:bg-brand-red/10'
                    }`}
                >
                    Выбрать
                </button>

                {/* ИСПРАВЛЕНИЕ ЛИНИИ: Теперь она серая, но краснеет при наведении */}
                <div className="w-full border-t border-card-border group-hover:border-brand-red/50 mb-8 transition-colors! duration-300"></div>

                <ul className="flex flex-col gap-4 mt-auto">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-desc-text">
                      <svg className="w-5 h-5 text-brand-red shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>

              </div>
            </div>
          ))}
        </div>
           </section>
        </div>
      </div>
    );
  }

  return (
    <section id="pricing-section" className="py-24 px-6 relative z-10 transition-colors duration-300 border-y border-light-red">
      <div className="max-w-7xl mx-auto">
        
        <h2 className="text-4xl md:text-5xl font-bold uppercase mb-16 text-center text-main-text">
          Тарифы
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            // flex-col и justify-end прижимают карточку к низу. 
            // pt-8 создает "воздух" сверху, куда карточка будет растягиваться при наведении.
            <div key={plan.id} className="relative group h-full flex flex-col justify-end">

              {plan.isPopular && (
                <GlowSpot
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[130%] opacity-70 group-hover:opacity-100 transition-opacity! duration-500 pointer-events-none z-99999 mix-blend-screen"
                />
              )}

              {/*
                  МАГИЯ ЗДЕСЬ:
                  1. !transition-all (с восклицательным знаком)
                  2. pb-14 (вместо pb-10, чтобы щиты не липли к низу)
              */}
              <div className="bg-card-bg w-full border border-card-border group-hover:border-brand-red/60 rounded-4xl p-8 md:p-10 flex flex-col relative z-10 transition-all! duration-500 ease-out h-full min-h-145 origin-bottom group-hover:scale-[1.04] group-hover:shadow-[0_0_60px_rgba(195,28,26,0.25)]">

                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-brand-red text-white text-xs font-bold uppercase px-6 py-2 rounded-tr-4xl rounded-bl-2xl">
                    Самый популярный
                  </div>
                )}

                <h3 className="text-brand-red text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-desc-text text-sm mb-8">{plan.desc}</p>

                <div className="mb-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-4xl font-bold text-main-text leading-none">{plan.price}</span>
                    {plan.oldPrice && (
                      <span className="text-desc-text text-xs font-mono mt-1 opacity-60 line-through">
                        {plan.oldPrice}
                      </span>
                    )}
                    {!plan.pricePerMonth && (
                      <span className="text-desc-text text-sm self-end pb-1">{plan.period}</span>
                    )}
                  </div>

                  {plan.pricePerMonth && (
                    <div className="flex items-center gap-2 text-desc-text text-sm font-mono mt-4">
                       <span className="text-desc-text">{plan.pricePerMonth}</span>
                       <span>{plan.period}</span>
                    </div>
                  )}
                </div>

                <button
                    className={`w-full py-4 rounded-full font-bold uppercase tracking-wider transition-all! duration-300 mb-10 ${
                        plan.isPopular
                        ? 'bg-brand-red text-white hover:bg-red-700 shadow-[0_0_20px_rgba(195,28,26,0.4)]'
                        : 'bg-transparent border border-card-border text-main-text hover:border-brand-red hover:bg-brand-red/10'
                    }`}
                >
                    Выбрать
                </button>

                {/* ИСПРАВЛЕНИЕ ЛИНИИ: Теперь она серая, но краснеет при наведении */}
                <div className="w-full border-t border-card-border group-hover:border-brand-red/50 mb-8 transition-colors! duration-300"></div>

                <ul className="flex flex-col gap-4 mt-auto">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-desc-text">
                      <svg className="w-5 h-5 text-brand-red shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>

              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}