import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { useTheme } from "../context/ThemeContext";
import { GlowSpot, LogoFooter } from "../assets/icons";
import { useLanguage } from '../context/LanguageContext';


export default function Footer() {
    const { t, toggleLanguage, lang } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    
    const { isAuth } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { setLoginModal, handlePricesClick, setFeedbackModal } = useUI();

    const [isBouncing, setIsBouncing] = useState(false);

    const handleLogoClick = () => {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 200);

        if (location.pathname === '/') {
            const scrollContainer = document.getElementById('scroll-container');
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            const scrollContainer = document.getElementById('scroll-container');
            if (scrollContainer) scrollContainer.scrollTop = 0;
            navigate('/');
        }
    };

    return (
        <footer className="border-t border-light-red py-20 px-6 relative z-10 overflow-hidden">
            <GlowSpot className="absolute inset-0 w-full h-full" />
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                    
                    <div className="flex flex-col gap-6 items-center md:items-start">
                        <button
                            onClick={handleLogoClick}
                            aria-label={t('footer.home')} 
                            title={t('footer.home')}
                            className={`text-main-text hover:opacity-80 cursor-pointer transition-transform ${
                                isBouncing ? 'scale-95' : 'scale-100'
                            }`}
                        >
                            <LogoFooter className="w-52.75 h-auto" />
                        </button>
                        <p className="text-desc-text text-sm leading-relaxed max-w-sm text-center md:text-left">
                            {t('footer.desc')}
                        </p>
                    </div>
                    <div className="flex flex-col md:place-items-end gap-4">
                        
                        <nav className="flex flex-col gap-3 text-desc-text text-sm uppercase font-medium p-1 items-center md:items-start">
                        <h4 className="font-bold uppercase text-main-text mb-2 p-1">{t('footer.navigation')}</h4>
                            <button
                                className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm text-left cursor-pointer uppercase"
                                onClick={() => {
                                    if (isAuth) navigate('/scanner');
                                    else setLoginModal(true);
                                }}
                            >
                                {t('header.features')}
                            </button>
                            <button
                                onClick={handlePricesClick} 
                                className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm text-left cursor-pointer uppercase"
                            >
                                {t('header.tariffs')}
                            </button>
                            <button onClick={toggleTheme} className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm text-left uppercase cursor-pointer">
                                {theme === 'dark' ? t('profileMenu.themeLight') : t('profileMenu.themeDark')}
                            </button>
                            <button onClick={toggleLanguage} className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm text-left uppercase">
                                {lang === 'ru' ? t('footer.versionEn') : t('footer.versionRu')}
                            </button>
                            <button
                                onClick={() => setFeedbackModal(true)}
                                className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm text-left cursor-pointer uppercase"
                            >
                                {t('profileMenu.feedback')}
                            </button>
                        </nav>
                    </div>

                    <div className="flex flex-col gap-4 items-center md:items-start">
                        <h4 className="font-bold uppercase text-main-text mb-2 p-1">{t('footer.contact')}:</h4>
                        <div className="flex flex-col gap-3 text-desc-text text-sm font-medium items-center md:items-start">
                            <a href="tel:+79911230322" className="hover:bg-brand-gray transition-colors duration-300 p-1 rounded-sm">+7 (991) 123-03-22</a>
                            <a href="mailto:CANIAPENTEST@GMAIL.COM" className="hover:bg-brand-gray transition-colors duration-300 p-1 rounded-sm">CANIAPENTEST@GMAIL.COM</a>
                        </div>
                    </div>

                </div>

                <div className="border-t border-light-red pt-8">
                    <p className="text-brand-red text-xs font-mono uppercase tracking-wider text-center md:text-left">
                        {t('footer.copyright')}
                    </p>
                </div>
            </div>
        </footer>
    );
}