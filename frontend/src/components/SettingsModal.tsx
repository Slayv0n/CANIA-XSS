import React, { useState, useRef } from 'react';
import { CloseIcon, GlowSpot, EyeOn, EyeOff } from '../assets/icons';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useUI } from '../context/UIContext';
import PasswordStrength from './PasswordStrength';

interface SettingsModalProps {
    mode: 'password' | 'email';
    onClose: () => void;
}

export default function SettingsModal({ mode, onClose }: SettingsModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    useFocusTrap(modalRef, true);

    const { userEmail, logout } = useAuth();
    const { t } = useLanguage();
    const { showToast } = useUI();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // Новые стейты для обработки входа через соцсети
    const [authMethod, setAuthMethod] = useState<'password' | 'email_code'>('password');
    const [currentEmailCode, setCurrentEmailCode] = useState('');
    const [isSendingCode, setIsSendingCode] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Валидация Шага 1 в зависимости от выбранного метода
    const isStep1Valid = authMethod === 'password' 
        ? currentPassword.length > 0 
        : currentEmailCode.length > 0;

    const isStep2PasswordValid = newPassword.length > 0 && newPassword === repeatPassword;
    const isStep2EmailValid = newEmail.includes('@') && newEmail.includes('.');
    const isStep3Valid = verificationCode.length >= 4;

    const handleSendCodeToCurrentEmail = async () => {
        try {
            setIsSendingCode(true);
            if (!userEmail) throw new Error("Нет email");
            await api.resetPasswordRequest(userEmail);
            setAuthMethod('email_code');
            showToast(t('settings.codeSent') || "Код отправлен", 'success');
        } catch (error) {
            showToast(t('settings.saveError'), 'error');
        } finally {
            setIsSendingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (step === 1) {
                if (!userEmail) throw new Error("Нет email");
                if (authMethod === 'password') {
                    await api.login({ email: userEmail, password: currentPassword });
                } else if (authMethod === 'email_code') {
                    await api.verifyResetToken(currentEmailCode, userEmail);
                }
                setStep(2);
            }
            else if (step === 2) {
                if (mode === 'password') {
                    await api.updatePassword(newPassword);
                    showToast(t('settings.passwordSuccess'), 'success');
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
                    showToast(t('settings.emailSuccess'), 'success');
                    onClose();
                    logout();
                } else {
                    showToast(t('settings.invalidVerificationCode'), 'error');
                }
            }
        } catch (error) {
            if (step === 1) {
                if (authMethod === 'password') showToast(t('settings.wrongPassword'), 'error');
                else showToast(t('settings.invalidVerificationCode'), 'error');
            } else {
                showToast(t('settings.saveError'), 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div ref={modalRef} className="bg-main-bg text-main-text w-full max-w-[480px] p-8 md:p-10 rounded-3xl shadow-2xl relative border border-card-border overflow-hidden">
                <GlowSpot className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[200px] h-[100px] opacity-90 light:opacity-50" />

                <button
                    onClick={onClose}
                    aria-label={t('settings.close')}
                    className="absolute top-6 right-6 text-desc-text hover:text-main-text transition-colors z-20 cursor-pointer">
                    <CloseIcon />
                </button>

                <form onSubmit={handleSubmit} className="relative z-10 flex flex-col w-full">

                    <h1 className="text-3xl font-bold mb-8 uppercase tracking-wide"> 
                        {step === 1 || mode === 'email' ? (mode === 'password' ? t('settings.titlePassword') : t('settings.titleEmail')) : t('settings.newPassword')}
                    </h1>

                    {step === 1 && (
                        <div className="flex flex-col gap-5">
                            {authMethod === 'password' ? (
                                <>
                                    <div className="flex flex-col gap-2 relative">
                                        <label className="text-desc-text text-sm pl-1">{t('settings.currentPasswordLabel')}</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full bg-input-bg border border-card-border rounded-xl p-3 pr-10 text-main-text outline-none focus:border-brand-red transition-colors"
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-desc-text hover:text-brand-red cursor-pointer transition-colors">
                                                {showPassword ? <EyeOff /> : <EyeOn />}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={!isStep1Valid || loading}
                                        className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer ${
                                            isStep1Valid 
                                                ? 'bg-brand-red text-white hover:bg-light-red' 
                                                : 'bg-input-bg text-desc-text opacity-50 cursor-not-allowed border border-card-border'
                                        }`}
                                    >
                                        {loading ? t('settings.loading') : t('settings.continueBtn')}
                                    </button>

                                    {/* Ссылка-помощник для тех, кто авторизовался без пароля */}
                                    <button 
                                        type="button" 
                                        onClick={handleSendCodeToCurrentEmail}
                                        disabled={isSendingCode}
                                        className="mt-2 text-sm text-brand-red hover:text-light-red transition-colors font-bold cursor-pointer outline-none focus-visible:underline text-center"
                                    >
                                        {isSendingCode ? t('settings.loading') : t('settings.forgotPassword')}
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col gap-5 animate-fade-in">
                                    <p className="text-sm text-desc-text mb-2">
                                        {t('auth.codeSentHint')} <span className="text-main-text font-bold">{userEmail}</span>.
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-desc-text text-sm pl-1">{t('auth.codeLabel')}</label>
                                        <input
                                            type="text"
                                            placeholder={t('auth.codePlaceholder') || 'Код'}
                                            value={currentEmailCode}
                                            onChange={(e) => setCurrentEmailCode(e.target.value)}
                                            className="w-full bg-input-bg border border-card-border rounded-xl p-3 text-main-text outline-none focus:border-brand-red transition-colors text-center"
                                        />
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={!isStep1Valid || loading}
                                        className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer ${
                                            isStep1Valid 
                                                ? 'bg-brand-red text-white hover:bg-light-red' 
                                                : 'bg-input-bg text-desc-text opacity-50 cursor-not-allowed border border-card-border'
                                        }`}
                                    >
                                        {loading ? t('settings.loading') : t('settings.continueBtn')}
                                    </button>

                                    <button 
                                        type="button" 
                                        onClick={() => setAuthMethod('password')}
                                        className="mt-2 text-sm text-desc-text hover:text-main-text transition-colors cursor-pointer outline-none focus-visible:underline text-center"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && mode === 'password' && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2 relative">
                                <label className="text-desc-text text-sm pl-1">{t('settings.newPasswordLabel')}</label>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-input-bg border border-card-border rounded-xl p-3 pr-10 text-main-text outline-none focus:border-brand-red transition-colors" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-desc-text hover:text-brand-red cursor-pointer transition-colors">
                                        {showPassword ? <EyeOff /> : <EyeOn />}
                                    </button>
                                </div>
                                <PasswordStrength password={newPassword} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-desc-text text-sm pl-1">{t('settings.repeatPasswordLabel')}</label>
                                <input type="password" placeholder="••••••••" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} className="w-full bg-input-bg border border-card-border rounded-xl p-3 text-main-text outline-none focus:border-brand-red transition-colors" />
                            </div>

                            <button type="submit" disabled={!isStep2PasswordValid || loading} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-4 cursor-pointer ${
                                isStep2PasswordValid 
                                    ? 'bg-brand-red text-white hover:bg-light-red' 
                                    : 'bg-input-bg text-desc-text opacity-50 cursor-not-allowed border border-card-border'
                            }`}>
                                {loading ? t('settings.saving') : t('settings.saveBtn')}
                            </button>
                        </div>
                    )}

                    {step === 2 && mode === 'email' && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-desc-text text-sm pl-1">{t('auth.newEmailLabel')}</label>
                                <input type="email" placeholder={t('auth.newEmailPlaceholder')} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-input-bg border border-card-border rounded-xl p-3 text-main-text outline-none focus:border-brand-red transition-colors" />
                            </div>
                            
                            <button type="submit" disabled={!isStep2EmailValid || loading} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-4 cursor-pointer ${
                                isStep2EmailValid 
                                    ? 'bg-brand-red text-white hover:bg-light-red' 
                                    : 'bg-input-bg text-desc-text opacity-50 cursor-not-allowed border border-card-border'
                            }`}>
                                {loading ? t('settings.saving') : t('settings.saveBtn')}
                            </button>
                        </div>
                    )}

                    {step === 3 && mode === 'email' && (
                        <div className="flex flex-col gap-5 animate-fade-in">
                            <p className="text-sm text-desc-text mb-2">
                                {t('auth.codeSentHint')} <span className="text-main-text font-bold">{newEmail}</span>.
                                <br/><span className="text-brand-red text-xs">{t('auth.codeHint')}</span>
                            </p>
                            <div className="flex flex-col gap-2">
                                <label className="text-desc-text text-sm pl-1">{t('auth.codeLabel')}</label>
                                <input
                                    type="text"
                                    maxLength={4}
                                    placeholder="0000"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    className="w-full bg-input-bg border border-card-border rounded-xl p-3 text-main-text outline-none focus:border-brand-red transition-colors tracking-[0.5em] font-mono text-center text-xl"
                                />
                            </div>
                            
                            <button type="submit" disabled={!isStep3Valid || loading} className={`w-full py-3.5 rounded-full font-bold uppercase tracking-wider transition-all mt-4 cursor-pointer ${
                                isStep3Valid 
                                    ? 'bg-brand-red text-white hover:bg-light-red' 
                                    : 'bg-input-bg text-desc-text opacity-50 cursor-not-allowed border border-card-border'
                            }`}>
                                {loading ? t('settings.saving') : t('settings.confirmBtn')}
                            </button>
                        </div>
                    )}

                </form>
            </div>
        </div>
    );
}