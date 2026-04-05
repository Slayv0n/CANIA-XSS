import { useState, useRef, useEffect } from 'react';
import { ArrowUp } from '../assets/icons';
// Компонент нашего кастомного селекта
export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  options: string[], 
  placeholder: string 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  },[]);

  return (
    <div className="relative flex flex-col gap-2" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-card-bg border p-4 rounded-sm text-desc-text outline-none cursor-pointer flex justify-between items-center focus:ring focus:ring-brand-red ${
          isOpen ? 'border-brand-red' : 'border-card-border hover:border-white/20'
        }`}
      >
        <span className={value ? 'text-main-text' : 'text-desc-text'}>
          {value || placeholder}
        </span>

        {/* Галочка, которая переворачивается при открытии */}
        <ArrowUp className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        
      </button>

      {/* Выпадающий список */}
      {isOpen && (
        <div className="absolute top-[105%] left-0 w-full bg-main-bg border border-card-border rounded-sm shadow-xl z-50 overflow-hidden animate-fade-in">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="px-4 py-3 cursor-pointer text-main-text hover:bg-card-border hover:transition-colors flex w-full"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}