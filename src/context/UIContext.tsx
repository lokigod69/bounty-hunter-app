// src/context/UIContext.tsx
// Phase 2: Extended with activeLayer coordination to manage overlay conflicts (menu vs modal vs critical).
// Centralizes overlay state and ensures only one layer is active at a time.
//
// MOBILE MENU BACKDROP HANDLING:
// - Mobile menu backdrop is rendered in Layout.tsx with z-index: 35 (--z-mobile-menu)
// - Backdrop taps reliably close the menu via explicit closeMenu() call
// - Menu panel uses stopPropagation() to prevent backdrop clicks when interacting inside
// - When a modal opens (z-index: 10000+), it renders above the mobile menu
// - Menu state is managed here; DOM rendering happens in Layout.tsx
// - See index.css for complete z-index hierarchy documentation

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

// Define the active overlay layer type
export type ActiveLayer = 'none' | 'menu' | 'modal' | 'critical';

// Define the shape of the context's value
interface UIContextType {
  isMobileMenuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  openMenu: () => void;
  forceCloseMobileMenu: () => void; // Kept for backward compatibility, but should be avoided
  activeLayer: ActiveLayer;
  openModal: () => void;
  openCriticalOverlay: () => void;
  clearLayer: () => void;
}

// Create the context with an undefined initial value
const UIContext = createContext<UIContextType | undefined>(undefined);

// Create the provider component
export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>('none');

  // Phase 2: Scroll locking is now handled by UIContext via activeLayer
  useEffect(() => {
    if (activeLayer !== 'none') {
      lockScroll();
    } else {
      unlockScroll();
    }
    
    // Cleanup on unmount
    return () => {
      if (activeLayer !== 'none') {
        unlockScroll();
      }
    };
  }, [activeLayer]);

  // Phase UX-2: Deterministic menu functions using useCallback
  const openMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
    setActiveLayer('menu');
  }, []);

  const closeMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    setActiveLayer('none');
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => {
      const next = !prev;
      setActiveLayer(next ? 'menu' : 'none');
      return next;
    });
  }, []);

  // Function to force immediate close for critical scenarios (kept as thin alias)
  const forceCloseMobileMenu = useCallback(() => {
    closeMenu();
  }, [closeMenu]);

  // Open modal layer (closes menu, but allows critical to stay)
  const openModal = useCallback(() => {
    if (activeLayer === 'menu') {
      setIsMobileMenuOpen(false);
    }
    // Modal can coexist with critical, but critical takes precedence visually
    if (activeLayer !== 'critical') {
      setActiveLayer('modal');
    }
  }, [activeLayer]);

  // Open critical overlay (closes menu and modal)
  const openCriticalOverlay = useCallback(() => {
    if (activeLayer === 'menu') {
      setIsMobileMenuOpen(false);
    }
    setActiveLayer('critical');
  }, [activeLayer]);

  // Clear all layers
  const clearLayer = useCallback(() => {
    setActiveLayer('none');
    // Do NOT touch the menu directly here.
    // If we ever need to clear overlays + menu, call closeMenu() explicitly at the call site instead.
  }, []);

  const value = {
    isMobileMenuOpen,
    toggleMenu,
    closeMenu,
    openMenu,
    forceCloseMobileMenu, // Kept for backward compatibility
    activeLayer,
    openModal,
    openCriticalOverlay,
    clearLayer,
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
