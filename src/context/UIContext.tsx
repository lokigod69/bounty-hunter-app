import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

// Define the active overlay layer type
export type ActiveLayer = 'none' | 'modal' | 'critical';

// Define the shape of the context's value
interface UIContextType {
  activeLayer: ActiveLayer;
  openModal: () => void;
  openCriticalOverlay: () => void;
  clearLayer: () => void;
}

// Create the context with an undefined initial value
const UIContext = createContext<UIContextType | undefined>(undefined);

// Create the provider component
export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  const openModal = useCallback(() => {
    setActiveLayer(current => current === 'critical' ? current : 'modal');
  }, []);
  const openCriticalOverlay = useCallback(() => setActiveLayer('critical'), []);

  // Clear all layers
  const clearLayer = useCallback(() => {
    setActiveLayer('none');
  }, []);

  const value = {
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
