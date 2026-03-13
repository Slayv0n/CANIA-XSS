import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AppContext';
import { GoogleIcon, GithubIcon, CloseIcon, GlowSpot } from '../assets/icons';

// Теперь только один обязательный пропс
interface LoginCardProps {
  onClose: () => void;
}

export default function LoginCard({ onClose }: LoginCardProps) {
    const { login } = useAuth();
    const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_email' | 'forgot_timer' | 'new_password'>('login'); 
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [agreePolicy, setAgreePolicy] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
        // Используем login() напрямую из контекста
        if (authMode === 'login' && isLoginValid) login();
        if (authMode === 'register' && isRegisterValid) login();
        
        if (authMode === 'forgot_email' && email) {
            setAuthMode('forgot_timer');
            setTimer(60);
        }
        if (authMode === 'new_password' && isNewPasswordValid) login();
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
                                <input 
                                    type="email" 
                                    placeholder="example@mail.com" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" 
                                />
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" 
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={authMode === 'login' ? !isLoginValid : !isRegisterValid}
                                    className="w-full py-3.5 rounded-full font-bold uppercase tracking-wider bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10 transition-all mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {authMode === 'login' ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}