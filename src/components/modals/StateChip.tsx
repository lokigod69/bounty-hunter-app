// src/components/modals/StateChip.tsx
// R9: State indicator chip for MissionModalShell
// Displays task state with icon and label in a subtle pill

import React from 'react';
import { Clock, Eye, Check, AlertTriangle, Archive } from 'lucide-react';
import { ModalState, stateConfig } from '../../theme/modalTheme';

interface StateChipProps {
  state: ModalState;
  className?: string;
}

const iconMap = {
  Clock,
  Eye,
  Check,
  AlertTriangle,
  Archive,
};

export const StateChip: React.FC<StateChipProps> = ({ state, className = '' }) => {
  const config = stateConfig[state];
  const Icon = iconMap[config.icon];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
      style={{
        backgroundColor: `rgba(${config.colorRgb}, 0.15)`,
        color: config.color,
      }}
    >
      <Icon size={12} />
      <span>{config.label}</span>
    </div>
  );
};

export default StateChip;
