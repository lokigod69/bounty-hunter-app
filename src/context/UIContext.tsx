// src/context/UIContext.tsx
// This file defines a React context for managing global UI state, such as the mobile menu visibility.
// Enhanced with state synchronization utilities to handle navigation and modal conflicts.
// COMPLETE MODAL SYSTEM: Global modal state tracking, automatic mobile menu coordination, and bulletproof state management.

import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of the context's value
interface UIContextType {
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  forceCloseMobileMenu: () => void; // Immediate force close for critical scenarios
  isAnyModalOpen: boolean; // Global modal state tracking
  registerModal: (modalId: string) => void; // Register modal as open
  unregisterModal: (modalId: string) => void; // Register modal as closed
}

// Create the context with an undefined initial value
const UIContext = createContext<UIContextType | undefined>(undefined);

// Create the provider component
export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openModals, setOpenModals] = useState<Set<string>>(new Set());

  // Derived state for any modal being open
  const isAnyModalOpen = openModals.size > 0;

  // Function to toggle the mobile menu state
  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  // Function to explicitly close the mobile menu
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Function to force immediate close for critical scenarios (navigation, modal conflicts)
  const forceCloseMobileMenu = () => {
    setMobileMenuOpen(false);
    // Force a re-render to ensure immediate state update
    setTimeout(() => setMobileMenuOpen(false), 0);
  };

  // Function to register a modal as open
  const registerModal = (modalId: string) => {
    setOpenModals(prev => new Set(prev).add(modalId));
    // Auto-close mobile menu when any modal opens
    if (isMobileMenuOpen) {
      forceCloseMobileMenu();
    }
  };

  // Function to unregister a modal as closed
  const unregisterModal = (modalId: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.delete(modalId);
      return newSet;
    });
  };

  const value = { 
    isMobileMenuOpen, 
    toggleMobileMenu, 
    closeMobileMenu, 
    forceCloseMobileMenu,
    isAnyModalOpen,
    registerModal,
    unregisterModal
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

// Create a custom hook for easy consumption of the context
export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
