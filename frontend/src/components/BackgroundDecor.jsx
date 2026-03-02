import React from 'react';

import { GlowSpot } from '../assets/icons';

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