import React from 'react';

export default function Hero({ onTryClick }) {
  return (
    <main className="flex flex-col items-center mt-32 px-4 text-center relative z-10">
      <span className="text-brand-red text-xs font-bold tracking-[0.4em] mb-6 uppercase opacity-80">
        • SYSTEM V1.0 ONLINE
      </span>

      <h1 className="text-5xl md:text-8xl font-black max-w-5xl leading-[1.05] uppercase mb-10 tracking-tighter text-main-text">
        Automated XSS <br /> 
        <span className="text-brand-red drop-shadow-[0_0_50px_rgba(195,28,26,0.4)]">
          Security Audit
        </span> 
      </h1>

      <p className="text-desc-text max-w-xl text-base md:text-lg leading-relaxed mb-12 opacity-70">
        CANIA-XSS utilizes microservices and AI to identify, verify, and document 
        vulnerabilities in your web applications.
      </p>

      <button 
        onClick={onTryClick}
        className="bg-brand-red text-white px-16 py-5 rounded-sm font-bold uppercase flex items-center gap-3 hover:bg-red-700 transition-all cursor-pointer group"
      >
        Попробовать 
        <span className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">↗</span>
      </button>
    </main>
  );
}