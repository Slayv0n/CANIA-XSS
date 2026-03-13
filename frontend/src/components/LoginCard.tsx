import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AppContext';
import { GoogleIcon, GithubIcon, CloseIcon, GlowSpot } from '../assets/icons';

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

    // Таймер
    const [timer, setTimer] = useState(60);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (authMode === 'login' && isLoginValid) login();
        if (authMode === 'register' && isRegisterValid) login();
        
        if (authMode === 'forgot_email' && email) {
            setAuthMode('forgot_timer');
            setTimer(60);
        }
        if (authMode === 'new_password' && isNewPasswordValid) {
            login();
        }
    };

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-main-bg text-white w-full max-w-120 p-8 md:p-10 rounded-3xl shadow-2xl relative border border-white/5 overflow-hidden">
                <GlowSpot className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-200 h-100 opacity-90" />

                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-20 cursor-pointer">
                    <CloseIcon />
                </button>

                <form onSubmit={handleSubmit} className="relative z-10 flex flex-col w-full">
                    
                    {(authMode === 'login' || authMode === 'register') && (
                        <>
                            <h1 className="text-3xl font-bold mb-8 uppercase tracking-wide">
                                {authMode === 'login' ? 'ВХОД' : 'РЕГИСТРАЦИЯ'}
                            </h1>
                            
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-gray-400 text-sm pl-1">Почта</label>
                                    <input type="email" placeholder="example@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" />
                                </div>
                                
                                <div className="flex flex-col gap-2 relative">
                                    <label className="text-gray-400 text-sm pl-1">Пароль</label>
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 pr-10 text-white outline-none focus:border-brand-red transition-colors" />
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
                                        <input type="password" placeholder="••••••••" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" />
                                    </div>
                                )}

                                {authMode === 'login' ? (
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => setAuthMode('forgot_email')} className="text-sm font-bold text-gray-400 hover:text-white transition-colors cursor-pointer">
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

                                <button type="submit" disabled={authMode === 'login' ? !isLoginValid : !isRegisterValid} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer ${(authMode === 'login' ? isLoginValid : isRegisterValid) ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'}`}>
                                    {authMode === 'login' ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
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
                                <button type="button" className="w-full border border-white/10 bg-transparent rounded-lg py-2.5 flex items-center justify-center gap-3 hover:bg-white/5 transition-colors text-sm font-medium text-gray-300 cursor-pointer">
                                    <GoogleIcon className="w-5 h-5" /> Продолжить с Google
                                </button>
                                <button type="button" className="w-full border border-white/10 bg-transparent rounded-lg py-2.5 flex items-center justify-center gap-3 hover:bg-white/5 transition-colors text-sm font-medium text-gray-300 cursor-pointer">
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
                                    <input type="email" placeholder="example@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" />
                                </div>
                                <button type="submit" disabled={!email} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer ${email ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'}`}>
                                    ПРОДОЛЖИТЬ
                                </button>
                            </div>
                            <button type="button" onClick={() => setAuthMode('login')} className="mt-6 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer">
                                ← Назад ко входу
                            </button>
                        </>
                    )}

                    {/* Таймер восстановления */}
                    {authMode === 'forgot_timer' && (
                        <>
                            <h1 className="text-3xl font-bold mb-8 uppercase tracking-wide">ВОССТАНОВЛЕНИЕ ПАРОЛЯ</h1>
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-gray-400 text-sm pl-1">Почта</label>
                                    <input type="email" value={email} disabled className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-gray-600 outline-none cursor-not-allowed" />
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed mt-2">
                                    Вам на почту было отправлено письмо с инструкциями. Проверьте ваш почтовый ящик.
                                </p>
                                <div className="text-center mt-6 text-3xl font-bold tracking-widest text-white">
                                    {formatTime(timer)}
                                </div>
                                <button type="button" onClick={() => setAuthMode('new_password')} className="mt-8 text-brand-red text-sm hover:underline font-bold cursor-pointer">
                                    [ТЕСТ] Перейди к смене пароля
                                </button>
                            </div>
                        </>
                    )}

                    {/* новый пароль */}
                    {authMode === 'new_password' && (
                        <>
                            <h1 className="text-3xl font-bold mb-8 uppercase tracking-wide">НОВЫЙ ПАРОЛЬ</h1>
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2 relative">
                                    <label className="text-gray-400 text-sm pl-1">Новый пароль</label>
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 pr-10 text-white outline-none focus:border-brand-red transition-colors" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-gray-400 text-sm pl-1">Повторите пароль</label>
                                    <input type="password" placeholder="••••••••" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" />
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