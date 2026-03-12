import React, { useState } from "react";
import { CloseIcon, GlowSpot } from "../assets/icons";

export default function Feedback({ isOpen, onClose }) {
    const [feedbackText, setFeedbackText] = useState("");

    const handleSubmit = () => {
        if (feedbackText.trim()) {
            console.log("Отправлен отзыв:", feedbackText);
            setFeedbackText("");
            onClose();
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleOverlayClick}
            onKeyDown={handleKeyDown}
        >
            <div className="bg-main-bg border border-card-border rounded-lg py-10 px-14 w-full max-w-3xl max-h-2xl mx-4 shadow-2xl animate-fade-in relative overflow-hidden">
                {/* Glowspot - снизу по центру, половина за карточкой */}
                <GlowSpot className="absolute bottom-[-50%] left-1/2 -translate-x-1/2 w-400 h-100 z-0 pointer-events-none opacity-50 light:opacity-80" />

                {/* Заголовок и кнопка закрытия */}
                <button
                    onClick={onClose}
                    className="text-desc-text hover:text-main-text transition-colors absolute right-4 top-4 z-10"
                >
                    <CloseIcon className="w-5 h-5" />
                </button>

                {/* Текст описания */}
                <h1 className="text-desc-text text-2xl mb-4 relative z-10">
                    Напишите свое мнение о сайте
                </h1>

                {/* Поле ввода */}
                <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Ваш отзыв..."
                    rows={8}
                    className="w-full bg-input-bg border border-input-border rounded-md px-4 py-3 text-main-text placeholder-desc-text text-sm focus:outline-none focus:border-brand-red transition-colors resize-none relative z-10"
                />

                {/* Кнопка отправки */}
                <div className="flex justify-end mt-4 relative z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={!feedbackText.trim()}
                        className="bg-brand-red hover:bg-brand-red/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-2 rounded-3xl transition-colors"
                    >
                        Отправить
                    </button>
                </div>
            </div>
        </div>
    );
}
