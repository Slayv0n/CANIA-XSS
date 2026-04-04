import {FirstVector, SecondVector} from '../assets/icons/index';
import { useLanguage } from '../context/LanguageContext';

export default function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      title: t('howItWorks.step1Title'),
      text: t('howItWorks.step1Text'),
      marginClass: "md:mt-0"
    },
    {
      title: t('howItWorks.step2Title'),
      text: t('howItWorks.step2Text'),
      marginClass: "md:mt-32"
    },
    {
      title: t('howItWorks.step3Title'),
      text: t('howItWorks.step3Text'),
      marginClass: "md:mt-64"
    }
  ];

  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">

        <h2 className="text-4xl md:text-6xl font-bold uppercase mb-8 text-center text-main-text">
          {t('howItWorks.title')}
        </h2>
        <h3 className='text-center mb-20'>{t('howItWorks.subtitle')}</h3>

        {/* Контейнер с relative для позиционирования векторов */}
        <div className="relative">

          {/* Сетка с колонками */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <div key={index} className={`flex flex-col ${step.marginClass}`}>

                <h3 className="text-xl md:text-2xl font-bold uppercase mb-8 leading-tight min-h-15 text-main-text">
                  {step.title}
                </h3>

                <p className="text-sm text-desc-text leading-relaxed mb-8">
                  {step.text}
                </p>

                <div className="w-full h-px bg-light-red"></div>

              </div>
            ))}
          </div>

          {/* Первый вектор - между 1 и 2 колонкой (под текстом первой колонки) */}
          <div className="hidden md:block absolute top-60 left-[15%]">
            <FirstVector className="w-50 h-auto" />
          </div>

          {/* Второй вектор - между 2 и 3 колонкой (над title третьей колонки) */}
          <div className="hidden md:block absolute top-30 left-[70%]">
            <SecondVector className="w-50 h-auto" />
          </div>

        </div>

      </div>
    </section>
  );
}
