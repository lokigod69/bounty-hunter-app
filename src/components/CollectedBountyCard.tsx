// src/components/CollectedBountyCard.tsx
// Component to display a single collected bounty with a Pokemon card-like style.
// Replaced inline style with Tailwind class for maxHeight.

import React from 'react';
import { CollectedBounty } from '../hooks/useCollectedBounties'; // Using the extended type

interface CollectedBountyCardProps {
  bounty: CollectedBounty;
}

const CollectedBountyCard: React.FC<CollectedBountyCardProps> = ({ bounty }) => {
  return (
    <div className="bg-slate-800 border-4 border-yellow-400 rounded-xl p-4 shadow-xl hover:shadow-yellow-500/50 transition-shadow duration-300 w-64 h-96 flex flex-col justify-between transform hover:scale-105">
      {/* Image Section */}
      <div className="w-full h-40 bg-slate-700 rounded-md mb-3 overflow-hidden border-2 border-yellow-300">
        {bounty.image_url ? (
          <img src={bounty.image_url} alt={bounty.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            No Image
          </div>
        )}
      </div>

      {/* Name Section */}
      <h3 className="text-lg font-bold text-yellow-400 mb-1 truncate" title={bounty.name}>{bounty.name}</h3>

      {/* Description Section */}
      <p className="text-xs text-slate-300 mb-2 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700 max-h-20">
        {bounty.description}
      </p>

      {/* Footer Info */}
      <div className="mt-auto pt-2 border-t border-yellow-400/50">
        <p className="text-xs text-yellow-500">Cost: {bounty.credit_cost} Credits</p>
        <p className="text-xs text-slate-400">Collected: {new Date(bounty.collected_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default CollectedBountyCard;
