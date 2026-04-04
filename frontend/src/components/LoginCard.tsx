import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon, GithubIcon, CloseIcon, GlowSpot } from '../assets/icons';
import { api, setAccessToken, setRefreshToken, RegisterRequest, LoginRequest } from '../api';

interface LoginCardProps {
    onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot_email' | 'forgot_timer' | 'new_password';

export default function LoginCard({ onClose }: LoginCardProps) {
    const { login } = useAuth();
    const [authMode, setAuthMode] = useState<AuthMode>('login');

    // Состояния полей
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [agreePolicy, setAgreePolicy] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Таймер
    const [timer, setTimer] = useState(60);

    const [resetToken, setResetToken] = useState('');

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (authMode === 'forgot_timer' && timer > 0) {
            interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [authMode, timer]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const isLoginValid = email.length > 0 && password.length > 0;
    const isRegisterValid = email.length > 0 && password.length > 0 && repeatPassword.length > 0 && agreePolicy;
    const isNewPasswordValid = password.length > 0 && repeatPassword.length > 0 && password === repeatPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (authMode === 'register' && isRegisterValid) {
                // 1. Создаем аккаунт
                await api.register({ email, password } as RegisterRequest);
                
                // 2. Ждем 1-2 секунды, чтобы RabbitMQ успел прокинуть юзера в AuthDb
                // (Это костыль для распределенных систем, пока нет сложной логики)
                await new Promise(resolve => setTimeout(resolve, 1500));

                // 3. Сразу вызываем ЛОГИН, чтобы получить реальный токен
                const response = await api.login({ email, password } as LoginRequest);
                setAccessToken(response.accessToken);
                setRefreshToken(response.refreshToken);

                // 4. Только теперь пускаем в систему
                login(email);
                onClose();
            }
            // Реальный логин через API
            if (authMode === 'login' && isLoginValid) {
                const response = await api.login({ email, password } as LoginRequest);
                setAccessToken(response.accessToken);
                setRefreshToken(response.refreshToken);

                // Вызываем login и передаем email, который юзер ввел в форму
                login(email);
                onClose();
            }
            //пока что не доделано
            if (authMode === 'forgot_email' && email) {
                // 1. Отправляем запрос на реальный бэкенд
                await api.resetPasswordRequest(email);
                
                // 2. Переключаем интерфейс на таймер
                setAuthMode('forgot_timer');
                setTimer(60);
            }
            if (authMode === 'forgot_timer') {
                // 2. Юзер ввел токен из письма и жмет подтвердить
                await api.verifyResetToken(resetToken, email);
                // Если токен верный (ошибки не вылетело), пускаем менять пароль
                setAuthMode('new_password');
            }

            if (authMode === 'new_password' && isNewPasswordValid) {
                await api.completeReset(email, resetToken, password); 
                alert("Пароль успешно изменен! Теперь войдите.");
                setAuthMode('login');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-main-bg text-white w-full max-w-120 p-8 md:p-10 rounded-3xl shadow-2xl relative border border-white/5 overflow-hidden">
                <GlowSpot className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-200 h-100 opacity-90" />

                <button 
                    onClick={onClose} 
                    aria-label="Закрыть окно" 
                    className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors duration-300 z-20 cursor-pointer">
                    <CloseIcon />
                </button>

                <form onSubmit={handleSubmit} className="relative z-10 flex flex-col w-full">
                    
                    {(authMode === 'login' || authMode === 'register') && (
                        <>
                            <h1 className="text-3xl font-bold mb-8 uppercase tracking-wide">
                                {authMode === 'login' ? 'ВХОД' : 'РЕГИСТРАЦИЯ'}
                            </h1>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-xl text-sm mb-4">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-gray-400 text-sm pl-1">Почта</label>
                                    <input type="email" placeholder="example@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red" />
                                </div>

                                <div className="flex flex-col gap-2 relative">
                                    <label className="text-gray-400 text-sm pl-1">Пароль</label>
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 pr-10 text-white outline-none focus:border-brand-red" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer">
                                            {showPassword ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {authMode === 'register' && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-gray-400 text-sm pl-1">Повторите пароль</label>
                                        <input type="password" placeholder="••••••••" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red" />
                                    </div>
                                )}

                                {authMode === 'login' ? (
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => setAuthMode('forgot_email')} className="text-sm font-bold text-gray-400 hover:text-white transition-colors duration-300 cursor-pointer">
                                            Забыли пароль?
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mt-2">
                                        <input type="checkbox" id="policy" checked={agreePolicy} onChange={(e) => setAgreePolicy(e.target.checked)} className="w-4 h-4 rounded border-gray-600 bg-input-bg text-brand-red focus:ring-0 cursor-pointer" />
                                        <label htmlFor="policy" className="text-xs text-gray-400 cursor-pointer">
                                            Согласен с <a href="#" className="underline hover:text-white">политикой конфиденциальности</a>
                                        </label>
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={loading || (authMode === 'login' ? !isLoginValid : !isRegisterValid)} 
                                    className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer ${
                                        (authMode === 'login' ? isLoginValid : isRegisterValid) 
                                            ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' 
                                            : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'
                                    }`}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                            </svg>
                                            Загрузка...
                                        </span>
                                    ) : (
                                        authMode === 'login' ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ'
                                    )}
                                </button>
                            </div>

                            <div className="text-center text-sm mt-5">
                                <span className="text-gray-400">{authMode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}</span>
                                <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-brand-red font-bold hover:underline ml-1 cursor-pointer">
                                    {authMode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                                </button>
                            </div>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                                <div className="relative flex justify-center text-sm"><span className="px-3 bg-main-bg text-gray-500">Или</span></div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button type="button" className="w-full border border-white/10 bg-transparent rounded-lg py-2.5 flex items-center justify-center gap-3 hover:bg-white/5 transition-colors duration-300 text-sm font-medium text-gray-300 cursor-pointer">
                                    <GoogleIcon className="w-5 h-5" /> Продолжить с Google
                                </button>
                                <button type="button" className="w-full border border-white/10 bg-transparent rounded-lg py-2.5 flex items-center justify-center gap-3 hover:bg-white/5 transition-colors duration-300 text-sm font-medium text-gray-300 cursor-pointer">
                                    <GithubIcon className="w-5 h-5 text-white" /> Продолжить с GitHub
                                </button>
                            </div>
                        </>
                    )}

                    {/* забыли почту */}
                    {authMode === 'forgot_email' && (
                        <>
                            <h1 className="text-3xl font-bold mb-8 uppercase tracking-wide">ВОССТАНОВЛЕНИЕ ПАРОЛЯ</h1>
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-gray-400 text-sm pl-1">Почта</label>
                                    <input type="email" placeholder="example@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red" />
                                </div>
                                <button type="submit" disabled={!email} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer ${email ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'}`}>
                                    ПРОДОЛЖИТЬ
                                </button>
                            </div>
                            <button type="button" onClick={() => setAuthMode('login')} className="mt-6 text-gray-400 hover:text-white transition-colors duration-300 text-sm cursor-pointer">
                                ← Назад ко входу
                            </button>
                        </>
                    )}

                    {/* ЭКРАН ВВОДА КОДА */}
                    {authMode === 'forgot_timer' && (
                        <div className="flex flex-col gap-6 text-center animate-fade-in">
                            <h1 className="text-3xl font-bold uppercase tracking-wide">ВВОД КОДА</h1>
                            
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Мы отправили код для сброса пароля на <br/>
                                <span className="text-white font-bold">{email}</span>
                            </p>

                            {/* ИНПУТ ДЛЯ КОДА */}
                            <div className="flex flex-col gap-2 text-left mt-2">
                                <label className="text-gray-400 text-sm pl-1">Код из письма</label>
                                <input 
                                    type="text" 
                                    placeholder="Вставьте код..." 
                                    value={resetToken} 
                                    onChange={(e) => setResetToken(e.target.value)} 
                                    className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" 
                                />
                            </div>

                            {/* ЛОГИКА ТАЙМЕРА И КНОПКИ ПОВТОРА */}
                            <div className="mt-2">
                                {timer > 0 ? (
                                    <div className="text-3xl font-bold tracking-widest text-brand-red">
                                        {formatTime(timer)}
                                    </div>
                                ) : (
                                    <button 
                                        type="button" 
                                        onClick={async () => {
                                            setTimer(60);
                                            await api.resetPasswordRequest(email);
                                        }} 
                                        className="text-brand-red hover:text-white font-bold text-sm transition-colors cursor-pointer uppercase tracking-wider"
                                    >
                                        Отправить код ещё раз
                                    </button>
                                )}
                            </div>

                            {/* КНОПКА ПОДТВЕРЖДЕНИЯ */}
                            <button 
                                type="button" 
                                onClick={handleSubmit}
                                disabled={!resetToken || loading} 
                                className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer ${resetToken ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'}`}
                            >
                                {loading ? 'ПРОВЕРКА...' : 'ПОДТВЕРДИТЬ'}
                            </button>

                            <button type="button" onClick={() => setAuthMode('login')} className="mt-2 text-gray-500 hover:text-white text-sm transition-colors cursor-pointer">
                                Вернуться ко входу
                            </button>
                        </div>
                    )}

                    {/* новый пароль */}
                    {authMode === 'new_password' && (
                        <>
                            <h1 className="text-3xl font-bold mb-8 uppercase tracking-wide">НОВЫЙ ПАРОЛЬ</h1>
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2 relative">
                                    <label className="text-gray-400 text-sm pl-1">Новый пароль</label>
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 pr-10 text-white outline-none focus:border-brand-red" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-gray-400 text-sm pl-1">Повторите пароль</label>
                                    <input type="password" placeholder="••••••••" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red" />
                                </div>
                                <button type="submit" disabled={!isNewPasswordValid} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-4 cursor-pointer ${isNewPasswordValid ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'}`}>
                                    СОХРАНИТЬ
                                </button>
                            </div>
                        </>
                    )}

                </form>
            </div>
        </div>
    );
}