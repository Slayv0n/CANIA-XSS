import { Forward } from '../assets/icons';
import { useLanguage } from '../context/LanguageContext';

interface SafetyProps {
  onTryClick: () => void;
}

export default function Safety({ onTryClick }: SafetyProps) {
  const { t } = useLanguage();

  const safetyItems = [
    {
      title: t('safety.yourSafetyTitle'),
      text: t('safety.yourSafetyText'),
      spanClass: "md:col-start-1 md:col-span-2"
    },
    {
      title: t('safety.targetSafetyTitle'),
      text: t('safety.targetSafetyText'),
      spanClass: "md:col-start-2 md:col-span-2"
    },
    {
      title: t('safety.transparencyTitle'),
      text: t('safety.transparencyText'),
      spanClass: "md:col-start-1 md:col-span-2"
    }
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-bold uppercase mb-24 text-center text-main-text">
          {t('safety.title')}
        </h2>
        <div className="flex flex-col">
          {safetyItems.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 w-full">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 py-16 border-b border-light-red ${item.spanClass}`}>
                <h3 className="text-xl md:text-2xl font-bold uppercase leading-tight text-main-text">
                  {item.title}
                </h3>
                <p className="text-xs md:text-sm text-desc-text leading-relaxed self-end">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="w-full flex justify-end mt-20">
          <button
            onClick={onTryClick}
            className="bg-transparent border-brand-red border text-main-text px-10 py-4 rounded-4xl font-bold uppercase flex items-center gap-2 hover:bg-brand-red hover:text-white transition-colors duration-300 cursor-pointer group"
          >
            {t('safety.tryBtn')} <Forward />
          </button>
        </div>
      </div>
    </section>
  );
}
