import { useEffect, RefObject } from 'react';

export const useFocusTrap = (ref: RefObject<HTMLElement | null>, isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const modalElement = ref.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Ищем элементы заново при каждом нажатии Tab, чтобы учесть включенные/выключенные кнопки
      const focusableSelectors = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
      const focusableElements = Array.from(modalElement.querySelectorAll<HTMLElement>(focusableSelectors));
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) { // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else { // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Фокусим первый элемент при открытии
    const firstInput = modalElement.querySelector('input:not(:disabled), button:not(:disabled)') as HTMLElement;
    if (firstInput) setTimeout(() => firstInput.focus(), 10);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, ref]);
};