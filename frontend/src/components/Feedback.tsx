import React, { useState } from "react";
import { CloseIcon, GlowSpot } from "../assets/icons";
import { useLanguage } from "../context/LanguageContext";

interface FeedbackProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Feedback({ isOpen, onClose }: FeedbackProps) {
    const { t } = useLanguage();
    const [feedbackText, setFeedbackText] = useState("");

    const handleSubmit = () => {
        if (feedbackText.trim()) {
            console.log("Отправлен отзыв:", feedbackText);
            setFeedbackText("");
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-main-bg border border-card-border rounded-lg py-10 px-14 w-full max-w-3xl mx-4 shadow-2xl relative overflow-hidden">
                <GlowSpot className="absolute bottom-[-50%] left-1/2 -translate-x-1/2 w-400 h-100 opacity-50" />
                <button
                    onClick={onClose}
                    aria-label={t('feedback.close')}
                    className="absolute right-4 top-4 text-desc-text hover:text-main-text cursor-pointer">
                    <CloseIcon />
                </button>
                <h1 className="text-desc-text text-2xl mb-4">{t('feedback.title')}</h1>
                <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={t('feedback.placeholder')}
                    rows={8}
                    className="w-full bg-input-bg border border-input-border rounded-md px-4 py-3 text-main-text outline-none focus:border-brand-red"
                />
                <div className="flex justify-end mt-4">
                    <button onClick={handleSubmit} disabled={!feedbackText.trim()}
                    className="bg-brand-red hover:bg-brand-red/80 disabled:bg-gray-600 px-6 py-2 rounded-3xl text-white cursor-pointer"
                    aria-label={t('feedback.submit')}>
                        {t('feedback.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}
