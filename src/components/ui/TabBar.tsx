// src/components/ui/TabBar.tsx
// Shared tab bar primitive (Phase 1 congruence pass).
// Unifies the previously hand-rolled tab bars in Friends.tsx and
// RewardsStorePage.tsx, which had drifted in border color, text size,
// and lacked proper tab semantics. Provides:
// - role="tablist" / role="tab" + aria-selected
// - roving tabIndex with ArrowLeft/ArrowRight/Home/End keyboard navigation
// - 44px min touch target
// - optional count badge and optional unread "dot" indicator per tab
// - optional icon per tab
// - `fullWidth` layout (equal-width tabs spanning the bar, e.g. Friends)
//   vs the default centered/natural-width layout (e.g. RewardsStore)

import React, { useRef } from 'react';
import { cn } from '../../lib/utils';

export interface TabBarTab {
  id: string;
  label: string;
  /** Optional count badge, e.g. number of friends/requests. Hidden when 0/undefined. */
  count?: number;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Optional small unread/notification dot (e.g. pending friend requests). */
  showDot?: boolean;
}

interface TabBarProps {
  tabs: TabBarTab[];
  activeId: string;
  onChange: (id: string) => void;
  /** Equal-width tabs that fill the bar (Friends-style). Default: centered natural-width (RewardsStore-style). */
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function TabBar({
  tabs,
  activeId,
  onChange,
  fullWidth = false,
  className,
  'aria-label': ariaLabel,
}: TabBarProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    tabRefs.current[tab.id]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const nextTab = tabs[nextIndex];
      onChange(nextTab.id);
      focusTab(nextIndex);
    }
  };

  return (
    <div
      className={cn(
        'flex border-b border-white/10 overflow-x-auto',
        !fullWidth && 'justify-center px-2',
        className
      )}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn('flex', fullWidth ? 'gap-1 sm:gap-0 w-full' : 'gap-0 sm:gap-2')}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'relative px-4 py-2 sm:py-3 font-medium text-sm sm:text-base min-h-[44px] transition-all duration-200 whitespace-nowrap',
                fullWidth && 'flex-1 text-center',
                isActive
                  ? 'text-[var(--mode-accent)] border-b-2 border-[var(--mode-accent)]'
                  : 'text-slate-400 hover:text-slate-300'
              )}
            >
              {tab.icon && (
                <span className="inline-flex items-center mr-1 align-middle">{tab.icon}</span>
              )}
              {tab.label}
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className="ml-2 bg-white/10 rounded-full px-2 py-0.5 text-xs">
                  {tab.count}
                </span>
              )}
              {tab.showDot && (
                <span className="ml-1 bg-amber-500 rounded-full h-2 w-2 inline-block absolute top-2 right-2 sm:top-3 sm:right-3" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TabBar;
