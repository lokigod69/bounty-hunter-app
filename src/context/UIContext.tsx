// src/context/UIContext.tsx
// Phase 2: Extended with activeLayer coordination to manage overlay conflicts (menu vs modal vs critical).
// Centralizes overlay state and ensures only one layer is active at a time.

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

// Phase 8: Hard cleanup guarantee for overlay-root
// Ensures no zombie overlays remain when activeLayer === 'none'
function clearOverlayRoot(): void {
  const el = document.getElementById('overlay-root');
  if (!el) return;
  // Brutal but safe: remove all child nodes
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

// Define the active overlay layer type
export type ActiveLayer = 'none' | 'menu' | 'modal' | 'critical';

// Define the shape of the context's value
interface UIContextType {
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  forceCloseMobileMenu: () => void; // Immediate force close for critical scenarios
  activeLayer: ActiveLayer;
  openMenu: () => void;
  openModal: () => void;
  openCriticalOverlay: () => void;
  clearLayer: () => void;
}

// Create the context with an undefined initial value
const UIContext = createContext<UIContextType | undefined>(undefined);

// Create the provider component
export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>('none');

  // Phase 8: Sync scroll lock with activeLayer and ensure overlay-root cleanup
  useEffect(() => {
    if (activeLayer !== 'none') {
      lockScroll();
    } else {
      unlockScroll();
      clearOverlayRoot(); // Phase 8: Ensure no zombie overlays when layer is cleared
    }
    
    // Cleanup on unmount
    return () => {
      if (activeLayer !== 'none') {
        unlockScroll();
      }
    };
  }, [activeLayer]);

  // Phase 8: Minimal logging to verify state changes
  useEffect(() => {
    console.log('[UIContext] activeLayer:', activeLayer, 'isMobileMenuOpen:', isMobileMenuOpen);
  }, [activeLayer, isMobileMenuOpen]);

  // Function to toggle the mobile menu state
  const toggleMobileMenu = () => {
    console.log("[UIContext] toggleMobileMenu called, current state:", isMobileMenuOpen);
    if (isMobileMenuOpen) {
      closeMobileMenu();
    } else {
      openMenu();
    }
  };

  // Function to explicitly close the mobile menu
  const closeMobileMenu = () => {
    console.log("[UIContext] closeMobileMenu called");
    setMobileMenuOpen(false);
    if (activeLayer === 'menu') {
      setActiveLayer('none');
    }
  };

  // Function to force immediate close for critical scenarios (navigation, modal conflicts)
  const forceCloseMobileMenu = () => {
    setMobileMenuOpen(false);
    if (activeLayer === 'menu') {
      setActiveLayer('none');
    }
  };

  // Open menu layer (closes modals/critical if open)
  const openMenu = () => {
    console.log("[UIContext] openMenu called, current activeLayer:", activeLayer);
    if (activeLayer === 'modal' || activeLayer === 'critical') {
      setActiveLayer('menu');
    } else {
      setActiveLayer('menu');
    }
    setMobileMenuOpen(true);
    console.log("[UIContext] Menu opened, isMobileMenuOpen set to true");
  };

  // Open modal layer (closes menu, but allows critical to stay)
  const openModal = () => {
    if (activeLayer === 'menu') {
      setMobileMenuOpen(false);
    }
    // Modal can coexist with critical, but critical takes precedence visually
    if (activeLayer !== 'critical') {
      setActiveLayer('modal');
    }
  };

  // Open critical overlay (closes menu and modal)
  const openCriticalOverlay = () => {
    if (activeLayer === 'menu') {
      setMobileMenuOpen(false);
    }
    setActiveLayer('critical');
  };

  // Phase 8: Clear all layers - always sets activeLayer to 'none' with no conditionals
  const clearLayer = useCallback(() => {
    setMobileMenuOpen(false);
    setActiveLayer('none');
  }, []);

  const value = {
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
    forceCloseMobileMenu,
    activeLayer,
    openMenu,
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
