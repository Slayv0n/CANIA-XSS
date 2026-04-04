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
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [isLoginModalOpen, setLoginModal] = useState(false);
  const [isPricesModalOpen, setPricesModal] = useState(false);
  const [isFeedbackModalOpen, setFeedbackModal] = useState(false);
  const [isChangePasswordModalOpen, setChangePasswordModal] = useState(false);
  const [isChangeEmailModalOpen, setChangeEmailModal] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState<'password' | 'email'>('password');

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
    isChangeEmailModalOpen, setChangeEmailModal
  }),[
    isLoginModalOpen, isPricesModalOpen, isFeedbackModalOpen, 
    isSettingsModalOpen, settingsMode, isChangePasswordModalOpen, isChangeEmailModalOpen
  ]);

  return (
    <UIContext.Provider value={contextValue}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
};
