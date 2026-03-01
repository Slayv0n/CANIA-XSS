import React, { useState } from 'react';

export default function LoginCard({ onClose, onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authMode, setAuthMode] = useState('login');

    const isFormValid = email.length > 0 && password.length > 0;

    const handleAuth = (e) => {
        e.preventDefault(); // Останавливаем перезагрузку страницы при отправке формы
        if (!isFormValid) return;
        onLoginSuccess();
    };

    return (
        // ВАЖНО: Это теперь оверлей (затемненный фон поверх всего)
        // backdrop-blur-sm красиво размывает задний фон (фишка из макета)
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose} // Если кликнуть мимо карточки - закроется
        >
            
            {/* Сама карточка. onClick={(e) => e.stopPropagation()} нужен, 
                чтобы клик внутри карточки не закрывал её */}
            <div 
                className="bg-card-bg text-main-text w-full max-w-md p-10 rounded-[40px] shadow-2xl border border-card-border relative transition-all duration-300"
                onClick={(e) => e.stopPropagation()} 
            >
                
                {/* Крестик закрытия (в правом верхнем углу) */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 text-desc-text hover:text-brand-red transition-colors cursor-pointer"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>

                <h1 className="text-3xl font-bold mb-8 text-main-text">
                    {authMode === 'login' ? 'ВХОД' : 'РЕГИСТРАЦИЯ'}
                </h1>

                {/* Оборачиваем в form */}
                <form onSubmit={handleAuth}>
                    
                    <div className="mb-6">
                        <label className="text-sm font-medium block mb-2 text-desc-text">Почта</label>
                        <input
                            type="email" 
                            placeholder="example@mail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-card-border bg-transparent p-4 rounded-xl outline-none focus:border-brand-red transition-colors text-main-text"
                        />
                    </div>
                    
                    <div className="mb-6">
                        <label className="text-sm font-medium block mb-2 text-desc-text">Пароль</label>
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-card-border bg-transparent p-4 rounded-xl outline-none focus:border-brand-red transition-colors text-main-text"
                        />
                    </div>

                    <div className="flex items-center justify-between mb-8">
                        <label className="flex items-center text-sm text-desc-text cursor-pointer">
                            <input type="checkbox" className="mr-2 accent-brand-red" />
                            Запомнить меня
                        </label>
                        <a href="#" className="text-sm text-main-text font-medium hover:text-brand-red hover:underline">
                            Забыли пароль?
                        </a>
                    </div>

                    <button
                        type="submit"
                        disabled={!isFormValid}
                        className={`w-full py-4 rounded-xl text-white font-bold transition-all ${
                            isFormValid 
                                ? 'bg-brand-red hover:bg-red-700 cursor-pointer shadow-lg shadow-brand-red/20' 
                                : 'bg-gray-400 opacity-50 cursor-not-allowed'
                        }`}
                    >
                        {authMode === 'login' ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
                    </button>

                </form>

                <div className="text-center text-sm mt-6">
                    <span className="text-desc-text">
                        {authMode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                    </span>
                    <button 
                        type="button"
                        onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                        className="text-brand-red font-bold hover:underline cursor-pointer ml-1"
                    >
                        {authMode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                    </button>
                </div>

            </div>
        </div>
    );
}