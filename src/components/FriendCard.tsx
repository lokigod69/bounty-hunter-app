// src/components/FriendCard.tsx
// Phase 1: Updated to use BaseCard for consistent styling.
// R25: Added partner badge and "Set as Partner" action.
// Card component for displaying friend information.

import { useTranslation } from 'react-i18next';
import { Profile } from '../types/custom';  // R25: Use custom Profile type
import { CheckCircle, X, UserX, Trash2, Check, Heart } from 'lucide-react';
import { BaseCard } from './ui/BaseCard';
import { AppButton } from './ui/AppButton';

interface FriendCardProps {
  profile: Profile;
  friendshipId?: string;
  status?: 'accepted' | 'pending';
  isIncoming?: boolean;
  isPartner?: boolean;  // R25: Whether this friend is the current partner
  onAccept?: (friendshipId: string) => void;
  onReject?: (friendshipId: string) => void;
  onRemove?: (friendshipId: string) => void;
  onCancelSentRequest?: (friendshipId: string) => void;
  onSetPartner?: (friendId: string) => void;  // R25: Callback to set as partner
}

export default function FriendCard({
  profile,
  friendshipId,
  status = 'accepted',
  isIncoming = false,
  isPartner = false,  // R25
  onAccept,
  onReject,
  onRemove,
  onCancelSentRequest,
  onSetPartner,  // R25
}: FriendCardProps) {
  const { t } = useTranslation();

  // Get initials from display name or email
  const getInitials = () => {
    if (profile.display_name) {
      return profile.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    }
    return profile.email.substring(0, 2).toUpperCase();
  };

  return (
    // Wrap, don't overflow. The action cluster is built out of unbreakable
    // 44/48px buttons, so its min-content width is ~270px; with the 48px avatar
    // and the margins the row's min-content was 334px in English and 380px in
    // German ("Annehmen" 122.4 + gap 12 + "Ablehnen" 135.7 + ml-4 16 + 64)
    // inside a content box that is 296px on a 360px phone. A flex item's
    // min-width defaults to `auto`, i.e. min-content, so the row could not
    // shrink to fit however much the identity column gave away — it spilled
    // past the card's own border, and body{overflow-x:hidden} clipped the
    // evidence at the viewport edge instead of showing a scrollbar.
    //
    // No breakpoint here on purpose: the demand is content- and locale-driven,
    // so flex-wrap plus a basis floor resolves it at every width in every
    // language, where an xs:/sm: guess would only cover the widths we happened
    // to think of.
    <BaseCard variant="glass" className="flex flex-wrap items-center gap-x-4 gap-y-3">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {profile.avatar_url ? (
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <img
              src={profile.avatar_url}
              alt={profile.display_name || profile.email}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center text-white font-medium">
            {getInitials()}
          </div>
        )}
      </div>

      {/* Info.
          basis-40 (160px) is the floor at which a display name and an email are
          still worth rendering. It used to be flex-1 min-w-0 alone, which means
          "give away everything" — so this column reached 0 and the row STILL
          overflowed. With a basis the actions wrap onto their own line instead
          of eating the identity, which is the whole point of the card. */}
      <div className="flex-1 basis-40 min-w-0">
        <h3 className="font-medium truncate">
          {profile.display_name || profile.email.split('@')[0]}
        </h3>
        <p className="text-sm text-white/70 truncate">{profile.email}</p>
      </div>

      {/* Status/Actions.
          gap, not space-x: space-x-* is margin-left on every item after the
          first, and under flex-wrap that margin lands on the first item of each
          wrapped line too. ml-auto right-aligns the cluster when it is alone on
          the second line and collapses to nothing when it shares the first. */}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {status === 'accepted' && (
          <>
            {/* R25: Show Partner badge or Set as Partner action */}
            {/* The mr-2 these three used to carry is now the container's
                gap-2 — a margin on the last item of a wrapped line is dead
                space that pushes the line width up for nothing. */}
            {isPartner ? (
              <span className="text-teal-400 flex items-center text-sm bg-teal-500/10 px-2 py-1 rounded-full">
                <Heart size={14} className="mr-1" />
                {t('friendCard.partnerBadge')}
              </span>
            ) : onSetPartner ? (
              <button
                onClick={() => onSetPartner(profile.id)}
                className="text-white/50 hover:text-teal-400 flex items-center text-sm transition-colors"
                title={t('friendCard.setAsPartner')}
              >
                <Heart size={14} className="mr-1 flex-shrink-0" />
                {t('friendCard.setAsPartner')}
              </button>
            ) : (
              <span className="text-green-400 flex items-center text-sm">
                <CheckCircle size={16} className="mr-1" />
                {t('friendCard.friendBadge')}
              </span>
            )}
            {onRemove && friendshipId && (
              <button
                onClick={() => onRemove(friendshipId)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-red-400 transition-colors"
                aria-label={t('friendCard.removeFriend')}
                title={t('friendCard.removeFriend')}
              >
                <UserX size={18} />
              </button>
            )}
          </>
        )}

        {status === 'pending' && isIncoming && onAccept && onReject && friendshipId && (
          <div className="flex gap-3">
            {/* No flex-1: this wrapper is content-sized, so flex-1 on the
                buttons never had free space to distribute. It read as "these
                stretch", which is exactly the misreading that hid how wide the
                pair really is (German: 122.4 + 12 + 135.7 = 270px). */}
            <AppButton
              variant="cta"
              onClick={() => onAccept(friendshipId)}
              icon={<Check className="w-5 h-5" />}
            >
              {t('friendCard.accept')}
            </AppButton>
            <AppButton
              variant="danger"
              onClick={() => onReject(friendshipId)}
              icon={<X className="w-5 h-5" />}
            >
              {t('friendCard.decline')}
            </AppButton>
          </div>
        )}

        {status === 'pending' && !isIncoming && (
          <>
            <span className="text-amber-400 text-sm">{t('friendCard.pending')}</span>
            {onCancelSentRequest && friendshipId && (
              <button
                onClick={() => onCancelSentRequest(friendshipId)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors"
                aria-label={t('friendCard.cancelRequest')}
                title={t('friendCard.cancelRequest')}
              >
                <Trash2 size={18} />
              </button>
            )}
          </>
        )}
      </div>
    </BaseCard>
  );
}