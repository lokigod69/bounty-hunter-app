import { useTranslation } from 'react-i18next';
import { useFriends } from '../hooks/useFriends';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './ui/Spinner';

interface FriendSelectorProps {
  selectedFriend: string | null;
  setSelectedFriend: (friendId: string) => void;
  className?: string;
  placeholder?: string;
}

/** Every appearance uses the same connected people; selection is always explicit. */
export default function FriendSelector({ selectedFriend, setSelectedFriend, className = '', placeholder }: FriendSelectorProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { friends, loading, error } = useFriends(user?.id);
  if (loading) return <div className="flex items-center gap-2 text-slate-400"><Spinner size="sm" />{t('friendSelector.loading')}</div>;
  if (error) return <p role="alert" className="text-red-400">{t('friendSelector.error')}</p>;
  return <select value={selectedFriend || ''} onChange={event => setSelectedFriend(event.target.value)}
    aria-label={placeholder || t('friendSelector.placeholder')} className={`input-field w-full ${className}`}>
    <option value="">{friends.length ? (placeholder || t('friendSelector.placeholder')) : t('friendSelector.empty')}</option>
    {friends.map(({ friend }) => <option key={friend.id} value={friend.id}>{friend.display_name || friend.email}</option>)}
  </select>;
}
