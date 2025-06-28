// src/context/UIContext.tsx
// This file defines a React context for managing global UI state, such as the mobile menu visibility.

import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of the context's value
interface UIContextType {
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

// Create the context with an undefined initial value
const UIContext = createContext<UIContextType | undefined>(undefined);

// Create the provider component
export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Function to toggle the mobile menu state
  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  // Function to explicitly close the mobile menu
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const value = { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu };

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
