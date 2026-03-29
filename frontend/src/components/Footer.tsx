import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { useTheme } from "../context/ThemeContext";
import { GlowSpot, LogoFooter } from "../assets/icons";

export default function Footer() {
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
                    
                    <div className="flex flex-col gap-6 items-start">
                        <div
                            onClick={handleLogoClick}
                            className={`text-main-text hover:opacity-80 cursor-pointer transition-transform ${
                                isBouncing ? 'scale-95' : 'scale-100'
                            }`}
                        >
                            <LogoFooter className="w-52.75 h-auto" />
                        </div>
                        <p className="text-desc-text text-sm leading-relaxed max-w-sm">
                            Lorem ipsum dolor sit amet consectetur adipisicing elit. Obcaecati et esse aperiam mollitia fuga.
                        </p>
                    </div>

                    <div className="flex flex-col place-items-end gap-4">
                        <nav className="flex flex-col gap-3 text-desc-text text-sm uppercase font-medium p-1">
                        <h4 className="font-bold uppercase text-main-text mb-2 p-1">Навигация</h4>
                            <button
                                className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm text-left cursor-pointer uppercase"
                                onClick={() => {
                                    if (isAuth) navigate('/scanner');
                                    else setLoginModal(true);
                                }}
                            >
                                Функционал
                            </button>
                            <button
                                onClick={handlePricesClick}
                                className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm text-left cursor-pointer uppercase"
                            >
                                Тарифы
                            </button>
                            <button onClick={toggleTheme} className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm flex uppercase cursor-pointer">
                                {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                            </button>
                            <button className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm uppercase">
                                Версия на английском
                            </button>
                            <button
                                onClick={() => setFeedbackModal(true)}
                                className="p-1 hover:bg-brand-gray transition-colors duration-300 rounded-sm text-left cursor-pointer uppercase"
                            >
                                Оставить отзыв
                            </button>
                        </nav>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="font-bold uppercase text-main-text mb-2 p-1">Связаться:</h4>
                        <div className="flex flex-col gap-3 text-desc-text text-sm font-medium">
                            <a href="tel:+79911230322" className="hover:bg-brand-gray transition-colors duration-300 p-1 rounded-sm">+7 (991) 123-03-22</a>
                            <a href="mailto:CANIAPENTEST@GMAIL.COM" className="hover:bg-brand-gray transition-colors duration-300 p-1 rounded-sm">CANIAPENTEST@GMAIL.COM</a>
                        </div>
                    </div>

                </div>

                <div className="border-t border-light-red pt-8">
                    <span className="text-brand-red text-xs font-mono uppercase tracking-wider">
                        © 2026 CANIA-XSS-UI. Все права защищены
                    </span>
                </div>
            </div>
        </footer>
    );
}