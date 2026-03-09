import React from 'react';
import {Forward} from '../assets/icons'
export default function Hero({ onTryClick }) {
  return (
    <main className="flex flex-col items-center mt-32 px-4 text-center relative z-10">
      <span className="text-brand-red text-xs font-bold tracking-[0.4em] mb-6 uppercase opacity-80">
        • SYSTEM V1.0 ONLINE
      </span>

      <h1 className="text-5xl md:text-8xl font-black max-w-5xl leading-[1.05] uppercase mb-10 tracking-tighter text-main-text">
        Cania <br /> 
        <span className="text-brand-red drop-shadow-[0_0_50px_rgba(195,28,26,0.4)]">
          Web Security Audit
        </span> 
      </h1>

      <p className="text-desc-text max-w-xl text-base md:text-lg leading-relaxed mb-12 opacity-70">
        CANIA (Cyber Autonomic Network Intelligence Agent) использует микросервисы и искусственный интеллект для 
        поиска, верификации и документирования широкого спектра веб-уязвимостей — от XSS и SQL-инъекций до CSRF и IDOR.
      </p>

      <button 
        onClick={onTryClick}
        className="bg-brand-red text-white px-16 py-5 rounded-4xl font-bold uppercase flex items-center gap-3 hover:bg-red-800 cursor-pointer"
      >
        Попробовать <Forward />
      </button>
    </main>
  );
}