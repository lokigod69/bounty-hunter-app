// src/pages/BountyStorePage.tsx
// Displays available bounties, a form to create new bounties, handles bounty purchasing, and shows confetti on success.

import React, { useEffect, useState } from 'react';
import { useBounties } from '../hooks/useBounties';
import { CreateBountyForm } from '../components/CreateBountyForm';
import { Bounty } from '../types/database';
import Confetti from 'react-confetti';

const BountyStorePage: React.FC = () => {
  const { 
    bounties, 
    isLoadingBounties, 
    bountiesError, 
    fetchBounties,
    createBountyError, // To show potential errors from form submission if not handled within form
    purchaseBounty,
    isPurchasingBounty,
    purchaseBountyError
  } = useBounties();

  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchBounties();
  }, [fetchBounties]);
  const handleBountyCreated = (bountyId: string) => {
    console.log('New bounty created with ID:', bountyId);
    // Optionally, could add more sophisticated UI feedback here or refetch specific data
    // fetchBounties(); // Already called within useBounties hook after successful creation
  };

  const handlePurchase = async (bountyId: string) => {
    if (window.confirm('Are you sure you want to collect this bounty?')) {
      const result = await purchaseBounty(bountyId);
      if (result.success) {
        console.log('Bounty purchased successfully:', result.message);
        setShowConfetti(true);
        setTimeout(() => {
          setShowConfetti(false);
        }, 7000); // Show confetti for 7 seconds
      } else {
        // Error is already toasted from the hook
        console.error('Bounty purchase failed:', result.message);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 relative">
      {showConfetti && 
        <Confetti 
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.15}
        />
      }
      <h1 className="text-3xl font-bold text-white mb-8 text-center">Bounty Store</h1>

      {/* Section to Create New Bounties - For now, always visible */}
      <div className="mb-12">
        <CreateBountyForm onBountyCreated={handleBountyCreated} />
        {createBountyError && <p className="text-red-500 text-center mt-2">Error during bounty creation: {createBountyError}</p>}
      </div>

      <h2 className="text-2xl font-semibold text-white mb-6 text-center">Available Bounties</h2>

      {isLoadingBounties && <p className="text-slate-300 text-center">Loading bounties...</p>}
      {bountiesError && <p className="text-red-500 text-center">Error fetching bounties: {bountiesError}</p>}
      {purchaseBountyError && <p className="text-red-500 text-center mt-2">Error purchasing bounty: {purchaseBountyError}</p>}

      {!isLoadingBounties && !bountiesError && bounties.length === 0 && (
        <p className="text-slate-400 text-center">No bounties available at the moment. Check back soon!</p>
      )}

      {!isLoadingBounties && !bountiesError && bounties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bounties.map((bounty: Bounty) => (
            <div key={bounty.id} className="glass-card p-6 rounded-lg shadow-lg flex flex-col justify-between">
              <div>
                {bounty.image_url && (
                  <img src={bounty.image_url} alt={bounty.name} className="w-full h-48 object-cover rounded-md mb-4" />
                )}
                <h3 className="text-xl font-semibold text-white mb-2">{bounty.name}</h3>
                <p className="text-slate-300 text-sm mb-1">Cost: {bounty.credit_cost} Credits</p>
                <p className="text-slate-400 text-sm mb-4 min-h-[60px]">
                  {bounty.description || 'No description available.'}
                </p>
              </div>
              <button 
                onClick={() => handlePurchase(bounty.id)}
                className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50"
                disabled={isPurchasingBounty}
              >
                {isPurchasingBounty ? 'Collecting...' : 'Collect Bounty'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

};

export default BountyStorePage;
