import React from 'react';

export default function NotFound({ onGoHome }) {
  return (
    // flex-1 заставляет этот блок занять все свободное место между Хедером и Футером
    <main className="flex-1 flex flex-col items-center justify-center text-center px-4 min-h-[60vh] relative z-10">
      
      {/* Надпись "УПС!" */}
      <h2 className="text-3xl md:text-4xl font-bold uppercase text-main-text mb-2 font-title">
        Упс!
      </h2>

      {/* Огромные цифры 404 */}
      {/* leading-none: чтобы цифры не имели лишних отступов сверху/снизу */}
      {/* select-none: чтобы пользователь не выделял текст случайно */}
      <h1 className="text-[140px] md:text-[220px] font-black leading-none text-brand-red drop-shadow-[0_0_60px_rgba(195,28,26,0.6)] select-none font-title">
        404
      </h1>

      {/* Описание и ссылка */}
      <p className="text-desc-text text-sm md:text-base max-w-md mt-6 leading-relaxed font-body">
        Страница где-то потерялась и мы не можем ее найти
        <br />
        Попробуйте вернуться на{' '}
        <button
          onClick={onGoHome}
          className="text-brand-red font-bold hover:underline cursor-pointer transition-colors"
        >
          главную.
        </button>
      </p>

    </main>
  );
}