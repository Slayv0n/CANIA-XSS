import React from 'react';
import { Forward, Ai, File, Search, Shield } from '../assets/icons';
import { useLanguage } from '../context/LanguageContext';

interface FeaturesProps {
  onTryClick: () => void;
}

interface FeatureItem {
  title: string;
  text: string;
  icon: React.ReactNode;
  iconsClasses: string;
  containerClasses: string;
}

export default function Features({ onTryClick }: FeaturesProps) {
  const { t } = useLanguage();

  const features: FeatureItem[] = [
    {
      title: t('features.universalTitle'),
      text: t('features.universalText'),
      icon: <Search className="h-8 w-8 mb-4" />,
      iconsClasses: "flex flex-row-reverse",
      containerClasses: "flex flex-col h-full justify-between",
    },
    {
      title: t('features.threatsTitle'),
      text: t('features.threatsText'),
      icon: <Shield className="h-8 w-8 text-brand-red mb-4" />,
      iconsClasses: "flex flex-row-reverse justify-between",
      containerClasses: "flex flex-col-reverse h-full justify-between",
    },
    {
      title: t('features.aiTitle'),
      text: t('features.aiText'),
      icon: <Ai className="h-8 w-8 text-brand-red mb-4" />,
      iconsClasses: "flex flex-row-reverse justify-between",
      containerClasses: "flex flex-col h-full justify-between",
    },
    {
      title: t('features.reportTitle'),
      text: t('features.reportText'),
      icon: <File className="h-8 w-8 text-brand-red mb-4" />,
      iconsClasses: "flex flex-row-reverse justify-between",
      containerClasses: "flex flex-col-reverse h-full justify-between",
    }
  ];

  return (
    <section className="bg-transparent py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <h2 className="text-4xl md:text-5xl font-bold uppercase mb-6 text-center text-main-text">
          {t('features.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16 auto-rows-[1fr]">
          {features.map((item, index) => {
            let gridClasses = "md:col-span-1";
            if (index === 0) gridClasses = "md:row-span-2";
            else if (index === 3) gridClasses = "md:col-span-2";

            return (
              <div key={index} className={`border rounded-3xl p-8 flex flex-col justify-between border-light-red min-h-60 ${gridClasses}`}>
                <div className={item.containerClasses}>
                  <div className={item.iconsClasses}>
                    {item.icon}
                    <h3 className="text-xl font-bold uppercase mb-4 text-main-text">{item.title}</h3>
                  </div>
                  <p className="text-desc-text leading-relaxed text-sm">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="w-full flex justify-end">
            <button
              onClick={onTryClick}
              className="bg-transparent border-brand-red border-2 text-main-text px-10 py-4 rounded-4xl font-bold uppercase flex items-center gap-2 hover:bg-brand-red hover:text-white transition-colors duration-300 cursor-pointer"
            >
              <span className="flex gap-2 place-items-center text-lg">{t('features.tryBtn')} <Forward className='h-6'/> </span>
            </button>
        </div>
      </div>
    </section>
  );
}
