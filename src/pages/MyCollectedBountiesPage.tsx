// src/pages/MyCollectedBountiesPage.tsx
// This page displays the bounties collected by the logged-in user using a card layout.
// Removed unused fetchCollectedBounties from hook destructuring.

import React, { useEffect } from 'react';
import { useCollectedBounties } from '../hooks/useCollectedBounties';
import CollectedBountyCard from '../components/CollectedBountyCard';

const MyCollectedBountiesPage: React.FC = () => {
  const { collectedBounties, isLoading, error } = useCollectedBounties();

  useEffect(() => {
    // fetchCollectedBounties is called initially by the hook
    // but if you want to re-fetch on component mount for any reason (e.g. after an action on another page)
    // you could call it here. For now, the hook's internal useEffect handles initial fetch.
  }, []); // No dependencies, relying on hook's internal fetch logic

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-white mb-8 text-center">My Collected Bounties</h1>

      {isLoading && <p className="text-slate-300 text-center">Loading your collection...</p>}
      {error && <p className="text-red-500 text-center">Error loading collection: {error}</p>}

      {!isLoading && !error && collectedBounties.length === 0 && (
        <div className="text-center text-slate-400">
          <p>You haven't collected any bounties yet.</p>
          <p>Visit the Bounty Store to find some!</p>
        </div>
      )}

      {!isLoading && !error && collectedBounties.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-items-center">
          {collectedBounties.map((bounty) => (
            <CollectedBountyCard key={bounty.collection_id} bounty={bounty} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCollectedBountiesPage;
