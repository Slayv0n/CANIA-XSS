import React, { useState } from 'react';
import { CloseIcon, GlowSpot } from '../assets/icons';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface SettingsModalProps {
    mode: 'password' | 'email';
    onClose: () => void;
}

export default function SettingsModal({ mode, onClose }: SettingsModalProps) {
    const { userEmail, logout } = useAuth();
    const { t } = useLanguage();

    const [step, setStep] = useState<1 | 2 | 3>(1);

    const [currentPassword, setCurrentPassword] = useState('');
    const[newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
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
            if (step === 1) {
                if (!userEmail) throw new Error("Нет email");
                await api.login({ email: userEmail, password: currentPassword });
                setStep(2);
            }
            else if (step === 2) {
                if (mode === 'password') {
                    await api.updatePassword(newPassword);
                    alert(t('settings.passwordSuccess'));
                    onClose();
                    logout();
                } else if (mode === 'email') {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setStep(3);
                }
            }
            else if (step === 3) {
                if (verificationCode === '0000') {
                    await api.updateEmail(newEmail);
                    alert(t('settings.emailSuccess'));
                    onClose();
                    logout();
                } else {
                    alert(t('auth.passwordError'));
                }
            }
        } catch (error) {
            if (step === 1) alert(t('settings.wrongPassword'));
            else alert(t('settings.saveError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-main-bg text-white w-full max-w-120 p-8 md:p-10 rounded-3xl shadow-2xl relative border border-white/5 overflow-hidden">
                <GlowSpot className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-200 h-100 opacity-90" />

                <button
                    onClick={onClose}
                    aria-label={t('settings.close')}
                    className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-20 cursor-pointer">
                    <CloseIcon />
                </button>

                <form onSubmit={handleSubmit} className="relative z-10 flex flex-col w-full">

                    <h1 className="text-3xl font-bold mb-8 uppercase tracking-wide">
                        {step === 1 || mode === 'email' ? (mode === 'password' ? t('settings.titlePassword') : t('settings.titleEmail')) : t('settings.newPassword')}
                    </h1>

                    {step === 1 && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2 relative">
                                <label className="text-gray-400 text-sm pl-1">{t('settings.currentPasswordLabel')}</label>
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
                                {loading ? t('settings.loading') : t('settings.continueBtn')}
                            </button>
                        </div>
                    )}

                    {step === 2 && mode === 'password' && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2 relative">
                                <label className="text-gray-400 text-sm pl-1">{t('settings.newPasswordLabel')}</label>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 pr-10 text-white outline-none focus:border-brand-red transition-colors" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-sm pl-1">{t('settings.repeatPasswordLabel')}</label>
                                <input type="password" placeholder="••••••••" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" />
                            </div>
                            <button type="submit" disabled={!isStep2PasswordValid || loading} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-4 cursor-pointer ${isStep2PasswordValid ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'}`}>
                                {loading ? t('settings.saving') : t('settings.saveBtn')}
                            </button>
                        </div>
                    )}

                    {step === 2 && mode === 'email' && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-sm pl-1">{t('auth.newEmailLabel')}</label>
                                <input type="email" placeholder={t('auth.newEmailPlaceholder')} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-red transition-colors" />
                            </div>
                            <button type="submit" disabled={!isStep2EmailValid || loading} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-4 cursor-pointer ${isStep2EmailValid ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A] border border-white/10' : 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed border border-white/5'}`}>
                                {loading ? t('settings.saving') : t('settings.saveBtn')}
                            </button>
                        </div>
                    )}

                    {step === 3 && mode === 'email' && (
                        <div className="flex flex-col gap-5 animate-fade-in">
                            <p className="text-sm text-gray-400 mb-2">
                                {t('auth.codeSentHint')} <span className="text-white font-bold">{newEmail}</span>.
                                <br/><span className="text-brand-red text-xs">{t('auth.codeHint')}</span>
                            </p>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-sm pl-1">{t('auth.codeLabel')}</label>
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
                                {loading ? t('settings.saving') : t('settings.confirmBtn')}
                            </button>
                        </div>
                    )}

                </form>
            </div>
        </div>
    );
}
