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
  created_at: string;
  updated_at: string;
}

export function ProfileDebugger() {
  const { user, profile: contextProfile } = useAuth();
  const [dbRow, setDbRow] = useState<DBProfileRow | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDirectFromDB = useCallback(async () => {
    if (!user) {
      console.log('[ProfileDebugger] No user, cannot fetch');
      return;
    }

    setLoading(true);
    setDbError(null);

    console.log('[ProfileDebugger] Fetching directly from DB for user:', user.id.substring(0, 8));

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[DB PROFILES ROW] Error:', error);
        setDbError(error.message);
        setDbRow(null);
      } else {
        // R17: Log the FULL row for debugging - this is ground truth
        console.log('[DB PROFILES ROW]', {
          id: data.id,
          email: data.email,
          display_name: data.display_name,
          avatar_url: data.avatar_url,
          role: data.role,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
        setDbRow(data);
      }
    } catch (err) {
      console.error('[ProfileDebugger] Unexpected error:', err);
      setDbError(String(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  // R17: Compare DB vs Context
  const compareStates = useCallback(() => {
    console.log('=== R17 PROFILE COMPARISON ===');
    console.log('[CONTEXT PROFILE]', {
      id: contextProfile?.id,
      display_name: contextProfile?.display_name,
      avatar_url: contextProfile?.avatar_url,
      updated_at: contextProfile?.updated_at,
    });
    console.log('[DB PROFILE]', {
      id: dbRow?.id,
      display_name: dbRow?.display_name,
      avatar_url: dbRow?.avatar_url,
      updated_at: dbRow?.updated_at,
    });

    if (!contextProfile || !dbRow) {
      console.log('[COMPARISON] Cannot compare - missing data');
      return;
    }

    const matches = {
      display_name: contextProfile.display_name === dbRow.display_name,
      avatar_url: contextProfile.avatar_url === dbRow.avatar_url,
      updated_at: contextProfile.updated_at === dbRow.updated_at,
    };

    console.log('[COMPARISON RESULT]', matches);

    if (!matches.display_name) {
      console.warn('[MISMATCH] display_name differs!', {
        context: contextProfile.display_name,
        db: dbRow.display_name,
      });
    }
    if (!matches.avatar_url) {
      console.warn('[MISMATCH] avatar_url differs!', {
        context: contextProfile.avatar_url?.substring(0, 60),
        db: dbRow.avatar_url?.substring(0, 60),
      });
    }
    console.log('=== END COMPARISON ===');
  }, [contextProfile, dbRow]);

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
          <button
            onClick={compareStates}
            disabled={!dbRow}
            className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-white text-xs disabled:opacity-50"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
