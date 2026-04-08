import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface UIContextType {
  isLoginModalOpen: boolean;
  setLoginModal: (open: boolean) => void;
  isPricesModalOpen: boolean;
  setPricesModal: (open: boolean) => void;
  isFeedbackModalOpen: boolean;
  setFeedbackModal: (open: boolean) => void;
  isChangePasswordModalOpen: boolean;
  setChangePasswordModal: (open: boolean) => void;
  isChangeEmailModalOpen: boolean;
  setChangeEmailModal: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  settingsMode: 'password' | 'email';
  openSettingsModal: (mode: 'password' | 'email') => void;
  closeSettingsModal: () => void;
  handlePricesClick: (e?: React.MouseEvent) => void;

  showToast: (message: string, type?: 'success' | 'error') => void;
}
type ToastType = {
  id: number;
  message: string;
  type: 'success' | 'error';
  isClosing?: boolean;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [isLoginModalOpen, setLoginModal] = useState(false);
  const [isPricesModalOpen, setPricesModal] = useState(false);
  const [isFeedbackModalOpen, setFeedbackModal] = useState(false);
  const [isChangePasswordModalOpen, setChangePasswordModal] = useState(false);
  const [isChangeEmailModalOpen, setChangeEmailModal] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState<'password' | 'email'>('password');
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    // Добавляем новый тост в массив
    setToasts((prev) => [...prev, { id, message, type }]);

    // Через 3000 мс мы не удаляем тост, а делаем ему .map() и ставим isClosing: true.
    setTimeout(() => {
      setToasts((prev) => prev.map((toast) => toast.id === id ? { ...toast, isClosing: true } : toast));
      //И сразу же запускаем второй setTimeout на 400 мс (время анимации), в котором уже делаем .filter() и полностью удаляем тост из массива.
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 400);
    }, 3000);
  };

  const openSettingsModal = (mode: 'password' | 'email') => {
    setSettingsMode(mode);
    setIsSettingsModalOpen(true);
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  const handlePricesClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (window.location.pathname === '/') {
      const pricingSection = document.getElementById('pricing-section');
      const scrollContainer = document.getElementById('scroll-container');
      if (pricingSection && scrollContainer) {
        scrollContainer.scrollTo({ top: pricingSection.offsetTop, behavior: 'smooth' });
      }
    } else {
      setPricesModal(true);
    }
  };

  const contextValue = useMemo(() => ({
    isLoginModalOpen, setLoginModal,
    isPricesModalOpen, setPricesModal,
    isFeedbackModalOpen, setFeedbackModal,
    isSettingsModalOpen, openSettingsModal, closeSettingsModal,
    settingsMode, handlePricesClick,
    isChangePasswordModalOpen, setChangePasswordModal,
    isChangeEmailModalOpen, setChangeEmailModal,
    showToast

  }),[
    isLoginModalOpen, isPricesModalOpen, isFeedbackModalOpen, 
    isSettingsModalOpen, settingsMode, isChangePasswordModalOpen, isChangeEmailModalOpen, toasts
  ]);

  return (
    <UIContext.Provider value={contextValue}>
      {children}
      
      {/* СЛОЙ С УВЕДОМЛЕНИЯМИ */}
      <div className="fixed bottom-5 right-5 z-10000 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-xl pointer-events-auto border 
              ${toast.isClosing ? 'animate-notification-out' : 'animate-notification-in'} 
              ${toast.type === 'error' ? 'bg-brand-red border-red-500 text-white' : 'bg-black/90 border-white/20 text-white light:bg-white light:text-main-text light:border-card-border'}
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>
      
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
};
