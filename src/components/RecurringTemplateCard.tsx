// src/components/RecurringTemplateCard.tsx
// Displays a recurring task template with actions like edit, delete, and toggle active status.
// Changes:
// - Replaced lucide-react Coins icon with custom SpinningCoinIcon with enhanced styling.

import React from 'react';

import { RecurringTemplateWithInstances } from '../hooks/useRecurringTasks';
import { Edit, Trash2, Zap, ZapOff } from 'lucide-react';
import SpinningCoinIcon from './SpinningCoinIcon';

interface RecurringTemplateCardProps {
  template: RecurringTemplateWithInstances;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const RecurringTemplateCard: React.FC<RecurringTemplateCardProps> = ({ template, onEdit, onDelete, onToggleActive }) => {
  // Calculate weekly progress based on instances that are 'completed' or 'in review'
  const weeklyProgress = template.instances.filter(i => i.status === 'completed' || i.status === 'review').length;
  const progressPercentage = template.frequency_limit > 0 ? (weeklyProgress / template.frequency_limit) * 100 : 0;



  return (
    <div className={`group relative flex h-full flex-col bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all ${!template.is_active ? 'opacity-60' : ''}`} data-template-id={template.id}>
      
      {/* Credits Badge */}
      <div className="absolute top-3 right-3">
        <div className="flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1 text-sm font-semibold text-amber-400 border border-amber-400/20">
          <SpinningCoinIcon size={16} className="-ml-1" />
          <span>{template.credit_value}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex-grow pr-8">
        <h3 className="font-bold text-lg text-purple-300 transition-colors group-hover:text-purple-400">{template.title}</h3>
        <p className="mt-2 text-sm text-slate-400 line-clamp-2 h-10">{template.description}</p>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between items-center text-xs font-medium text-slate-400">
          <span>QUOTA STATUS</span>
          <span>{weeklyProgress} / {template.frequency_limit}</span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-slate-700/50">
          <div
            className="h-2 rounded-full bg-purple-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-4">
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => onEdit(template.id)} 
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            title="Edit Template"
          >
            <Edit size={14} />
            <span>Modify Contract</span>
          </button>
          <button 
            onClick={() => onDelete(template.id)} 
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-red-900/80 hover:text-red-400"
            title="Delete Template"
          >
            <Trash2 size={14} />
            <span>Terminate Contract</span>
          </button>
        </div>
        <button 
          onClick={() => onToggleActive(template.id, !template.is_active)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${template.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/40' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          title={template.is_active ? 'Deactivate Template' : 'Activate Template'}
        >
          {template.is_active ? <Zap size={14} /> : <ZapOff size={14} />}
          <span>{template.is_active ? 'Active' : 'Inactive'}</span>
        </button>
      </div>
    </div>
  );
};

export default RecurringTemplateCard;
