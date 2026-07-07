// src/components/ui/Fab.tsx
// Standard floating action button: bottom-right on mobile, centered on desktop,
// safe-area aware, mode-accent colored. Replaces duplicated inline FAB markup.

import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FabProps {
  onClick: () => void;
  label: string; // accessible label
  icon?: React.ReactNode;
  className?: string;
}

export function Fab({ onClick, label, icon, className }: FabProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'fixed z-fab rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-[var(--mode-accent)]',
        'text-[#06231d] flex items-center justify-center min-w-[56px] min-h-[56px] p-4',
        'right-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto',
        className
      )}
      style={{
        backgroundColor: 'var(--mode-accent)',
        bottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
    >
      {icon ?? <Plus size={24} />}
    </button>
  );
}

export default Fab;
