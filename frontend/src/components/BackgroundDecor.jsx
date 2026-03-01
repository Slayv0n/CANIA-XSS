import React from 'react';

const GlowSpot = ({ className }) => (
  <div className={`absolute pointer-events-none ${className}`}>
    <svg width="100%" height="100%" viewBox="0 0 1522 1058" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <g filter="url(#filter_glow)">
        <ellipse cx="761" cy="529" rx="361" ry="129" fill="#52050C"/>
      </g>
      <defs>
        <filter id="filter_glow" x="0" y="0" width="1522" height="1058" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="200" result="effect1_foregroundBlur"/>
        </filter>
      </defs>
    </svg>
  </div>
);

export default function BackgroundDecor() {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      
      {/* 1. Твое главное пятно */}
      <GlowSpot className="top-37.5 left-1/2 -translate-x-1/2 w-300 h-150 opacity-80" />

      {/* 2. Боковое слева */}
      <GlowSpot className="top-200 -left-75 w-200 h-200 opacity-60" />

      {/* 3. Справа в районе Safety */}
      <GlowSpot className="top-450 -right-50 w-225 h-225 opacity-50" />

      {/* Твои дополнительные пятна */}
      <GlowSpot className="top-500 right-300 w-250 h-125 opacity-40" />
      <GlowSpot className="top-700 right-150 w-250 h-125 opacity-40" />

      {/* 4. В самом низу */}
      <GlowSpot className="bottom-0 left-1/2 -translate-x-1/2 w-screen h-125 opacity-70" />

      {/* Твои линии SVG оставляем как есть */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <path d="M -100 400 L 400 100 L 1000 900 L 1600 500" stroke="white" strokeWidth="0.5" fill="none" className="opacity-10"/>
        <path d="M 1500 1200 L 600 2000 L -200 1500" stroke="#C31C1A" strokeWidth="1" fill="none" className="opacity-20"/>
      </svg>
      
    </div>
  );
}