import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { translations, Language } from '../locales';

interface LanguageContextType {
  lang: Language;
  toggleLanguage: () => void;
  t: (key: string) => string; // Функция-переводчик
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // По умолчанию ставим русский (в будущем можно брать из localStorage или настроек браузера)
  const [lang, setLang] = useState<Language>('ru');

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ru' ? 'en' : 'ru'));
  };

  // Умная функция перевода. Принимает ключ 'header.login' и отдает текст 'Вход'
  const t = (key: string): string => {
    const keys = key.split('.'); // Разделяем 'header.login' на ['header', 'login']
    let result: any = translations[lang];
    
    for (const k of keys) {
      if (result[k] === undefined) return key; // Если перевода нет, возвращаем сам ключ
      result = result[k];
    }
    return result;
  };

  // Кэшируем объект, чтобы не было лишних перерисовок
  const contextValue = useMemo(() => ({ lang, toggleLanguage, t }), [lang]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};