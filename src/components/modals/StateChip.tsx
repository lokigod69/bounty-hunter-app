// src/components/modals/StateChip.tsx
// R9: Localized state indicator chip for MissionModalShell.

import React from 'react';
import { Clock, Eye, Check, AlertTriangle, Archive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      <span>{t(config.labelKey)}</span>
    </div>
  );
};

export default StateChip;
