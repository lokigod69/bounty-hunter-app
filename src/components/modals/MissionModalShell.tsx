// src/components/modals/MissionModalShell.tsx
// R9: Unified modal shell for mission-related modals
// Implements glassmorphism design with mode/role/state theming

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Target,
  Stamp,
  Coins,
  Shield,
  Home,
  Heart,
  User,
  ListChecks,
  ClipboardList,
  PenSquare,
  Gift,
} from 'lucide-react';
import { ThemeId } from '../../theme/theme.types';
import {
  ModalRole,
  ModalState,
  modeColors,
  getRoleConfig,
  stateConfig,
  getModeStyleVars,
} from '../../theme/modalTheme';
import { StateChip } from './StateChip';
import { useUI } from '../../context/UIContext';
import { getOverlayRoot } from '../../lib/overlayRoot';
import DoubleCoinValue from '../coin/DoubleCoinValue';

// ============================================================================
// Types
// ============================================================================

interface UserInfo {
  name: string;
  avatar?: string;
}

interface RewardInfo {
  type: 'credit' | 'text' | 'image';
  value: string | number;
  imageUrl?: string;
}

interface ActionButton {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'accent' | 'success' | 'danger';
}

interface MissionModalShellProps {
  // Core
  isOpen: boolean;
  onClose: () => void;

  // Theming
  mode: ThemeId;
  role: ModalRole;
  state: ModalState;

  // Content
  title: string;
  description?: string;

  // Context
  fromUser?: UserInfo;
  toUser?: UserInfo;

  // Reward
  reward?: RewardInfo;

  // Actions
  primaryAction?: ActionButton;
  secondaryAction?: ActionButton;
  deleteAction?: {
    onClick: () => void;
    loading?: boolean;
  };

  // Custom content
  children?: React.ReactNode;

  // Daily mission indicator
  isDaily?: boolean;
  streakCount?: number;
}

// ============================================================================
// Icon Maps - R10: Extended for mode-aware role icons
// ============================================================================

const roleIconMap = {
  Target,
  Stamp,
  Coins,
  ListChecks,
  ClipboardList,
  PenSquare,
  Heart,
  Gift,
};

const modeIconMap = {
  Shield,
  Home,
  Heart,
};

// ============================================================================
// Component
// ============================================================================

export const MissionModalShell: React.FC<MissionModalShellProps> = ({
  isOpen,
  onClose,
  mode,
  role,
  state,
  title,
  description,
  fromUser,
  toUser,
  reward,
  primaryAction,
  secondaryAction,
  deleteAction,
  children,
  isDaily,
  streakCount,
}) => {
  const { openModal, clearLayer } = useUI();
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Register with UIContext
  useEffect(() => {
    if (isOpen) {
      openModal();
      console.log('[MissionModalShell] open', { mode, role, state });
    }
    return () => {
      if (isOpen) {
        clearLayer();
      }
    };
  }, [isOpen, openModal, clearLayer, mode, role, state]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsAnimatingOut(false);
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  // Get configurations - R10: Use mode-aware getRoleConfig
  const modeConfig = modeColors[mode];
  const roleConf = getRoleConfig(mode, role);
  const stateConf = stateConfig[state];
  const RoleIcon = roleIconMap[roleConf.headerIcon];
  const ModeIcon = modeIconMap[modeConfig.icon];

  // Animation classes
  const animationClass = isMobile
    ? isAnimatingOut
      ? 'animate-modal-slide-down'
      : 'animate-modal-slide-up'
    : isAnimatingOut
    ? 'animate-modal-scale-down'
    : 'animate-modal-scale-up';

  // Determine context label based on role
  const contextLabel =
    role === 'creator'
      ? `Assigned to: ${toUser?.name || 'Unknown'}`
      : `From: ${fromUser?.name || 'Unknown'}`;
  const contextUser = role === 'creator' ? toUser : fromUser;

  return createPortal(
    <div
      data-overlay="MissionModalShell"
      data-mode={mode}
      className={`fixed inset-0 z-modal-backdrop flex ${
        isMobile ? 'items-end' : 'items-center'
      } justify-center p-0 sm:p-4`}
      style={getModeStyleVars(mode)}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 ${
          isMobile ? 'backdrop-blur-md' : 'backdrop-blur-lg'
        } ${isAnimatingOut ? 'animate-fade-out' : 'animate-fade-in'}`}
      />

      {/* Modal Content */}
      <div
        className={`
          relative z-modal-content
          w-full ${isMobile ? 'max-h-[95vh]' : 'max-w-2xl max-h-[90vh]'}
          ${isMobile ? 'rounded-t-2xl' : 'rounded-2xl'}
          flex flex-col
          overflow-hidden
          ${animationClass}
        `}
        style={{
          background: 'rgba(12, 18, 40, 0.92)',
          backdropFilter: isMobile ? 'blur(16px)' : 'blur(24px)',
          WebkitBackdropFilter: isMobile ? 'blur(16px)' : 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset,
            0 0 40px rgba(${modeConfig.accentRgb}, 0.1)
          `,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* State Border Accent */}
        {stateConf.hasBorderAccent && (
          <div
            className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
            style={{
              background: `linear-gradient(90deg, transparent, ${stateConf.color}, transparent)`,
            }}
          />
        )}

        {/* Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-white/10">
          {/* Top row: Role label + State chip + Close */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: modeConfig.accentSoft }}
              >
                <RoleIcon size={16} style={{ color: modeConfig.accent }} />
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: modeConfig.accent }}
              >
                {roleConf.headerLabel}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <StateChip state={state} />
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors z-modal-controls"
                aria-label="Close modal"
              >
                <X size={20} className="text-white/60 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 line-clamp-2">
            {title}
          </h2>

          {/* Context row: Avatar + From/To */}
          <div className="flex items-center gap-2 text-sm text-white/60">
            {contextUser?.avatar ? (
              <img
                src={contextUser.avatar}
                alt={contextUser.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <User size={16} className="text-white/40" />
            )}
            <span>{contextLabel}</span>

            {/* Daily badge */}
            {isDaily && (
              <span
                className="ml-2 px-2 py-0.5 rounded text-xs font-semibold"
                style={{
                  backgroundColor: modeConfig.accentSoft,
                  color: modeConfig.accent,
                }}
              >
                Daily
              </span>
            )}

            {/* Streak */}
            {streakCount !== undefined && streakCount > 0 && (
              <span className="text-orange-400 text-xs">
                🔥 {streakCount}-day streak
              </span>
            )}
          </div>
        </div>

        {/* Body - Scrollable */}
        <div
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* R11: CSS Grid layout for aligned columns */}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: isMobile
                ? '1fr'
                : reward
                ? 'minmax(0, 2fr) minmax(0, 1fr)'
                : '1fr',
              maxHeight: isMobile ? '60vh' : '50vh',
            }}
          >
            {/* Description Column */}
            <div className="h-full flex flex-col">
              {description && (
                <div className="flex-1 p-4 rounded-xl bg-white/5 border border-white/10 overflow-y-auto">
                  <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                    {description}
                  </p>
                </div>
              )}

              {/* Custom children content */}
              {children}
            </div>

            {/* Reward Column */}
            {reward && (
              <div className="h-full">
                <div
                  className="h-full p-4 rounded-xl text-center flex flex-col justify-center"
                  style={{
                    backgroundColor: modeConfig.accentSoft,
                    border: `1px solid ${modeConfig.accentMuted}`,
                  }}
                >
                  <p className="text-xs text-white/50 mb-2 uppercase tracking-wider">
                    Reward
                  </p>

                  {reward.type === 'credit' ? (
                    <div className="flex items-center justify-center py-2">
                      <DoubleCoinValue
                        value={
                          typeof reward.value === 'number'
                            ? reward.value
                            : parseInt(String(reward.value), 10) || 0
                        }
                      />
                    </div>
                  ) : reward.imageUrl ? (
                    <div className="relative w-24 h-24 mx-auto rounded-lg overflow-hidden border border-white/20">
                      <img
                        src={reward.imageUrl}
                        alt={String(reward.value)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <span className="text-2xl">🎁</span>
                      <span
                        className="text-lg font-semibold"
                        style={{ color: modeConfig.accent }}
                      >
                        {reward.value}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-white/10 space-y-3">
          {/* Primary/Secondary Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                disabled={primaryAction.loading || primaryAction.disabled}
                className={`
                  flex-1 sm:flex-none sm:min-w-[140px]
                  px-6 py-3 rounded-xl font-semibold
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    primaryAction.variant === 'success'
                      ? 'bg-green-500 hover:bg-green-600 text-black'
                      : primaryAction.variant === 'danger'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : ''
                  }
                `}
                style={
                  !primaryAction.variant || primaryAction.variant === 'accent'
                    ? {
                        backgroundColor: modeConfig.accent,
                        color: '#000',
                      }
                    : undefined
                }
              >
                {primaryAction.loading ? 'Loading...' : primaryAction.label}
              </button>
            )}

            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.loading || secondaryAction.disabled}
                className={`
                  flex-1 sm:flex-none sm:min-w-[100px]
                  px-6 py-3 rounded-xl font-semibold
                  bg-white/10 hover:bg-white/20 text-white
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    secondaryAction.variant === 'danger'
                      ? 'text-red-400 hover:bg-red-500/20'
                      : ''
                  }
                `}
              >
                {secondaryAction.loading ? 'Loading...' : secondaryAction.label}
              </button>
            )}
          </div>

          {/* Delete Action (Ghost red button for creator role) */}
          {deleteAction && role === 'creator' && (
            <div className="flex justify-center pt-2 border-t border-white/5">
              <button
                onClick={deleteAction.onClick}
                disabled={deleteAction.loading}
                className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteAction.loading ? 'Deleting...' : 'Delete mission'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    getOverlayRoot()
  );
};

export default MissionModalShell;
