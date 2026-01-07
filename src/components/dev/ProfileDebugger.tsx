// src/components/dev/ProfileDebugger.tsx
// R17: Temporary debug component to read profile directly from DB
// This bypasses all React state and caching to show the ground truth.
// Add <ProfileDebugger /> anywhere in the app to see the real DB state.

import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface DBProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export function ProfileDebugger() {
  const { user, profile: contextProfile } = useAuth();
  const [dbRow, setDbRow] = useState<DBProfileRow | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDirectFromDB = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setDbError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        setDbError(error.message);
        setDbRow(null);
      } else {
        setDbRow(data as unknown as DBProfileRow);
      }
    } catch (err) {
      setDbError(String(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900/95 border border-yellow-500/50 rounded-lg p-3 text-xs font-mono max-w-sm shadow-xl">
      <div className="text-yellow-400 font-bold mb-2">R17 Profile Debugger</div>

      <div className="space-y-2">
        <div className="text-white/70">
          <span className="text-cyan-400">User ID:</span> {user.id.substring(0, 8)}...
        </div>

        <div className="text-white/70">
          <span className="text-cyan-400">Context Profile:</span>
          <div className="ml-2 text-white/50">
            name: {contextProfile?.display_name || 'NULL'}
            <br />
            avatar: {contextProfile?.avatar_url ? contextProfile.avatar_url.substring(0, 30) + '...' : 'NULL'}
          </div>
        </div>

        {dbRow && (
          <div className="text-white/70">
            <span className="text-green-400">DB Row:</span>
            <div className="ml-2 text-white/50">
              name: {dbRow.display_name || 'NULL'}
              <br />
              avatar: {dbRow.avatar_url ? dbRow.avatar_url.substring(0, 30) + '...' : 'NULL'}
            </div>
          </div>
        )}

        {dbError && (
          <div className="text-red-400">Error: {dbError}</div>
        )}

        <div className="flex gap-2 mt-2">
          <button
            onClick={fetchDirectFromDB}
            disabled={loading}
            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-white text-xs"
          >
            {loading ? 'Loading...' : 'Fetch DB'}
          </button>
        </div>
      </div>
    </div>
  );
}
