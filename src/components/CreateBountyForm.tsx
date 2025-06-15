// src/components/CreateBountyForm.tsx
// This component provides a form for users to create new bounties.
import React, { useState, FormEvent } from 'react';
import { useBounties } from '../hooks/useBounties';
import { NewBountyData } from '../types/database';

interface CreateBountyFormProps {
  onBountyCreated?: (bountyId: string) => void; // Optional callback after successful creation
}

export const CreateBountyForm: React.FC<CreateBountyFormProps> = ({ onBountyCreated }) => {
  const { createBounty, isCreatingBounty, createBountyError } = useBounties();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [creditCost, setCreditCost] = useState<number | ''>('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (creditCost === '' || creditCost < 0) {
      alert('Please enter a valid non-negative credit cost.');
      return;
    }

    const bountyData: NewBountyData = {
      name,
      description: description || null,
      image_url: imageUrl || null,
      credit_cost: Number(creditCost),
    };

    const result = await createBounty(bountyData);
    if (result.success && result.bounty_id) {
      setName('');
      setDescription('');
      setImageUrl('');
      setCreditCost('');
      if (onBountyCreated) {
        onBountyCreated(result.bounty_id);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Create New Bounty</h2>
      
      <div>
        <label htmlFor="bounty-name" className="block text-sm font-medium text-gray-700">Bounty Name</label>
        <input
          type="text"
          id="bounty-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="bounty-description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="bounty-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="bounty-image-url" className="block text-sm font-medium text-gray-700">Image URL (Optional)</label>
        <input
          type="url"
          id="bounty-image-url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="bounty-credit-cost" className="block text-sm font-medium text-gray-700">Credit Cost</label>
        <input
          type="number"
          id="bounty-credit-cost"
          value={creditCost}
          onChange={(e) => setCreditCost(e.target.value === '' ? '' : Number(e.target.value))}
          required
          min="0"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {createBountyError && (
        <p className="text-sm text-red-600">Error: {createBountyError}</p>
      )}

      <button 
        type="submit" 
        disabled={isCreatingBounty}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isCreatingBounty ? 'Creating...' : 'Create Bounty'}
      </button>
    </form>
  );
};
