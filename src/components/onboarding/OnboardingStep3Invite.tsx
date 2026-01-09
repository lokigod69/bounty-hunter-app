// src/components/onboarding/OnboardingStep3Invite.tsx
// P2: Onboarding Step 3 - Invite Someone (Optional)

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { BaseCard } from '../ui/BaseCard';
import { ArrowRight, ArrowLeft, UserPlus, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OnboardingStep3InviteProps {
  onComplete: (invitedUserId: string | null) => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function OnboardingStep3Invite({
  onComplete,
  onSkip,
  onBack,
}: OnboardingStep3InviteProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!email.trim() || !user) return;

    setIsSearching(true);
    try {
      // Search for user by email
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (error || !profileData) {
        const errorMsg = 'User not found. Make sure they\'ve signed up for Bounty Hunter.';
        setInviteError(errorMsg);
        toast.error(errorMsg);
        setIsSearching(false);
        return;
      }

      if (profileData.id === user.id) {
        const errorMsg = 'You cannot invite yourself.';
        setInviteError(errorMsg);
        toast.error(errorMsg);
        setIsSearching(false);
        return;
      }

      // Check if friendship already exists
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${profileData.id}),and(user1_id.eq.${profileData.id},user2_id.eq.${user.id})`)
        .maybeSingle();

      if (existingFriendship) {
        const errorMsg = 'You already have a friendship or pending request with this user.';
        setInviteError(errorMsg);
        toast.error(errorMsg);
        setIsSearching(false);
        return;
      }

      // Send friend request
      setIsSending(true);
      setInviteError(null);
      const { error: inviteError } = await supabase
        .from('friendships')
        .insert({
          user1_id: user.id,
          user2_id: profileData.id,
          status: 'pending',
          requested_by: user.id,
        });

      if (inviteError) {
        throw inviteError;
      }

      toast.success(`Invitation sent to ${profileData.display_name || email}!`);
      setInviteError(null);
      onComplete(profileData.id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send invitation. Please try again.';
      setInviteError(errorMsg);
      toast.error(errorMsg);
      setIsSending(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSearch();
  };

  return (
    <BaseCard>
      <div className="space-y-6">
        <div className="text-center">
          <UserPlus size={48} className="mx-auto mb-4 text-teal-400" />
          <p className="text-body text-white/70">
            Invite someone to share missions and rewards with. You can skip this and invite people later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-white/70 mb-2">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full text-white"
              disabled={isSending || isSearching}
            />
            <p className="text-meta text-white/50 mt-1">
              They must already have a Bounty Hunter account.
            </p>
          </div>

          {inviteError && (
            <BaseCard className="bg-red-900/20 border-red-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-body text-red-400 font-semibold mb-1">Failed to send invitation</p>
                  <p className="text-meta text-red-400/70">{inviteError}</p>
                </div>
              </div>
            </BaseCard>
          )}

          {(isSearching || isSending) && (
            <div className="text-center text-white/70">
              {isSearching ? 'Searching...' : 'Sending invitation...'}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary flex items-center gap-2 flex-1"
              disabled={isSending || isSearching}
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="btn-secondary flex items-center gap-2 flex-1"
              disabled={isSending || isSearching}
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={!email.trim() || isSending || isSearching}
              className="btn-primary flex items-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Invite
              <ArrowRight size={20} />
            </button>
          </div>
        </form>
      </div>
    </BaseCard>
  );
}

