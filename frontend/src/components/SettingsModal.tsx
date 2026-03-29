import React, { useState } from 'react';
import { CloseIcon, GlowSpot } from '../assets/icons';
import { api } from '../api'; // Импортируем API
import { useAuth } from '../context/AppContext'; // Импортируем контекст

interface SettingsModalProps {
    mode: 'password' | 'email';
    onClose: () => void;
}

export default function SettingsModal({ mode, onClose }: SettingsModalProps) {
    const { userEmail, logout } = useAuth(); // Достаем email юзера

    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // Состояния инпутов
    const [currentPassword, setCurrentPassword] = useState('');
    const[newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    // Стейт для проверочного кода
    const[verificationCode, setVerificationCode] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const isStep1Valid = currentPassword.length > 0;
    const isStep2PasswordValid = newPassword.length > 0 && newPassword === repeatPassword;
    const isStep2EmailValid = newEmail.includes('@') && newEmail.includes('.');
    const isStep3Valid = verificationCode.length >= 4;


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            if (step === 1) {
                // ШАГ 1: Проверка пароля
                if (!userEmail) throw new Error("Нет email");
                await api.login({ email: userEmail, password: currentPassword });
                setStep(2);
            } 
            else if (step === 2) {
                // ШАГ 2: Выбор действия в зависимости от режима
                if (mode === 'password') {
                    // Если это пароль - сразу меняем и закрываем
                    await api.updatePassword(newPassword, token);
                    alert("Пароль успешно изменен! Пожалуйста, войдите заново.");
                    onClose();
                    logout(); // Выкидываем юзера на экран логина
                } else if (mode === 'email') {
                    // Если это почта - ИМИТИРУЕМ ОТПРАВКУ ПИСЬМА и идем на 3 шаг
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setStep(3);
                }
            }
            else if (step === 3) {
                // ШАГ 3: Проверка кода (только для почты)
                // КОСТЫЛЬ ДЛЯ РАЗРАБОТКИ: принимаем только код 0000
                if (verificationCode === '0000') {
                    await api.updateEmail(newEmail, token);
                    alert("Почта успешно изменена! Пожалуйста, войдите заново.");
                    onClose();
                    logout(); // Выкидываем юзера на экран логина
                } else {
                    alert("Неверный код подтверждения!");
                }
            }
        } catch (error) {
            if (step === 1) alert("Неверный текущий пароль!");
            else alert("Ошибка при сохранении новых данных");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-main-bg text-white w-full max-w-120 p-8 md:p-10 rounded-3xl shadow-2xl relative border border-white/5 overflow-hidden">
                <GlowSpot className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-200 h-100 opacity-90" />

                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-20 cursor-pointer">
                    <CloseIcon />
                </button>

                <form onSubmit={handleSubmit} className="relative z-10 flex flex-col w-full">
                    
                    <h1 className="text-3xl font-bold mb-8 uppercase tracking-wide">
                        {step === 1 || mode === 'email' ? `СМЕНА ${mode === 'password' ? 'ПАРОЛЯ' : 'ПОЧТЫ'}` : 'НОВЫЙ ПАРОЛЬ'}
                    </h1>

                    {/* ШАГ 1: ПОДТВЕРЖДЕНИЕ ПАРОЛЯ (Одинаково для обоих режимов) */}
                    {step === 1 && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2 relative">
                                <label className="text-gray-400 text-sm pl-1">Текущий пароль</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        value={currentPassword} 
                                        onChange={(e) => setCurrentPassword(e.target.value)} 
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 pr-10 text-white outline-none focus:border-brand-red transition-colors" 
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer">
                                        {showPassword ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={!isStep1Valid || loading} 
                                className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer ${
                                    isStep1Valid ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'
                                }`}
                            >
                                {loading ? 'ПРОВЕРКА...' : 'ПРОДОЛЖИТЬ'}
                            </button>
                        </div>
                    )}

                    {/* ШАГ 2: ВВОД НОВЫХ ДАННЫХ */}
                    {step === 2 && mode === 'password' && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2 relative">
                                <label className="text-gray-400 text-sm pl-1">Новый пароль</label>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 pr-10 text-white outline-none focus:border-brand-red transition-colors" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-sm pl-1">Повторите пароль</label>
                                <input type="password" placeholder="••••••••" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" />
                            </div>
                            <button type="submit" disabled={!isStep2PasswordValid || loading} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-4 cursor-pointer ${isStep2PasswordValid ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'}`}>
                                {loading ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
                            </button>
                        </div>
                    )}

                    {step === 2 && mode === 'email' && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-sm pl-1">Новая почта</label>
                                <input type="email" placeholder="new@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" />
                            </div>
                            <button type="submit" disabled={!isStep2EmailValid || loading} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-4 cursor-pointer ${isStep2EmailValid ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'}`}>
                                {loading ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
                            </button>
                        </div>
                    )}

                    {/* НОВЫЙ ШАГ 3: ВВОД КОДА */}
                    {step === 3 && mode === 'email' && (
                        <div className="flex flex-col gap-5 animate-fade-in">
                            <p className="text-sm text-gray-400 mb-2">
                                Мы отправили код подтверждения на <span className="text-white font-bold">{newEmail}</span>. 
                                <br/><span className="text-brand-red text-xs">(Для теста введите 0000)</span>
                            </p>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-sm pl-1">Код из письма</label>
                                <input 
                                    type="text" 
                                    maxLength={4}
                                    placeholder="0000" 
                                    value={verificationCode} 
                                    onChange={(e) => setVerificationCode(e.target.value)} 
                                    className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors tracking-[0.5em] font-mono text-center text-xl" 
                                />
                            </div>
                            <button type="submit" disabled={!isStep3Valid || loading} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-4 cursor-pointer ${isStep3Valid ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'}`}>
                                {loading ? 'СОХРАНЕНИЕ...' : 'ПОДТВЕРДИТЬ'}
                            </button>
                        </div>
                    )}

                </form>
            </div>
        </div>
    );
}