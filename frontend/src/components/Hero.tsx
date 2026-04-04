import { Forward } from '../assets/icons';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onTryClick: () => void;
}

export default function Hero({ onTryClick }: HeroProps) {
  const { t } = useLanguage();
  return (
    <main className="flex flex-col items-center mt-32 px-4 text-center relative z-10">
      <span className="text-brand-red text-xs font-bold tracking-[0.4em] mb-6 uppercase opacity-80">
        {t('hero.subtitle')}
      </span>

      <h1 className="text-5xl md:text-8xl font-black max-w-5xl leading-[1.05] uppercase mb-10 tracking-tighter text-main-text">
        {t('hero.title1')} <br /> 
        <span className="text-brand-red drop-shadow-[0_0_50px_rgba(195,28,26,0.4)]">
          {t('hero.title2')}
        </span> 
      </h1>

      <p className="text-desc-text max-w-xl text-base md:text-lg leading-relaxed mb-12 opacity-70">
        {t('hero.desc')}
      </p>

      <button
        onClick={onTryClick}
        className="bg-transparent border-brand-red border text-main-text px-10 py-4 rounded-4xl font-bold uppercase flex items-center gap-2 hover:bg-brand-red hover:text-white transition-colors duration-300 cursor-pointer group"
      >
        {t('hero.button')} <Forward />
      </button>
    </main>
  );
}