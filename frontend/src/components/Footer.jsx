import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // 1. Импортируем хуки
import { LogoFooter, LogoFull } from "../assets/icons";

export default function Footer({ isAuth, onLoginClick }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Стейт для анимации "пружинки" при клике
    const[isBouncing, setIsBouncing] = useState(false);

    const handleLogoClick = () => {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 200);

        if (location.pathname === '/') {
            // Если уже дома — плавно едем наверх
            const scrollContainer = document.getElementById('scroll-container');
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            // ИЗМЕНЕНИЕ ЗДЕСЬ: Сбрасываем скролл прямо перед переходом
            const scrollContainer = document.getElementById('scroll-container');
            if (scrollContainer) scrollContainer.scrollTop = 0;
            
            // Едем домой
            navigate('/');
        }
    };

    return (
        <footer className="border-t border-card-border py-20 px-6 relative z-10">
            <div className="max-w-7xl mx-auto">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                    
                    {/* Колонка 1: Лого и описание */}
                    <div className="flex flex-col gap-6 items-start">
                        
                        {/* МАГИЯ ТУТ: Добавили onClick и динамический класс для bounce-эффекта */}
                        <div 
                            onClick={handleLogoClick}
                            className={`text-main-text hover:opacity-80 cursor-pointer transition-transform duration-200 ease-out ${
                                isBouncing ? 'scale-95' : 'scale-100'
                            }`}
                        >
                            <LogoFooter className="w-52.75 h-auto" />
                        </div>

                        <p className="text-desc-text text-sm leading-relaxed max-w-sm">
                            Lorem ipsum dolor sit amet consectetur adipisicing elit. Obcaecati et esse aperiam mollitia fuga.
                        </p>
                    </div>

                    {/* Колонка 2: Навигация (оставляем как было) */}
                    <div className="flex flex-col gap-4">
                        <h4 className="font-bold uppercase text-main-text mb-2">Навигация</h4>
                        <nav className="flex flex-col gap-3 text-desc-text text-sm uppercase font-medium">
                            <a 
                                href="#" 
                                className="hover:text-brand-red transition-colors" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    
                                    if (isAuth) {
                                    navigate('/scanner'); 
                                    } else {
                                    onLoginClick();
                                    }
                                }} 
                                >
                                Функционал
                            </a>
                            <a href="#" className="hover:text-brand-red transition-colors">Тарифы</a>
                            <a href="#" className="hover:text-brand-red transition-colors">EN</a>
                            <a href="#" className="hover:text-brand-red transition-colors">Оставить отзыв</a>
                        </nav>
                    </div>

                    {/* Колонка 3: Контакты (оставляем как было) */}
                    <div className="flex flex-col gap-4">
                        <h4 className="font-bold uppercase text-main-text mb-2">Связаться:</h4>
                        <div className="flex flex-col gap-3 text-desc-text text-sm font-medium">
                            <a href="tel:+79911230322" className="hover:text-brand-red transition-colors">+7 (991) 123-03-22</a>
                            <a href="mailto:CANIAPENTEST@GMAIL.COM" className="hover:text-brand-red transition-colors">CANIAPENTEST@GMAIL.COM</a>
                        </div>
                    </div>
                </div>

                {/* Копирайт */}
                <div className="border-t border-card-border pt-8">
                    <span className="text-brand-red text-xs font-mono uppercase tracking-wider">
                        © 2026 CANIA-XSS-UI. Все права защищены
                    </span>
                </div>
                
            </div>
        </footer>
    );
}