// Exchanges the stored bounty-proofs URL for a short-lived signed URL.
// The bucket is private; callers must never change the persisted URL format.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { safeUrlRender } from '../lib/proofConfig';

type SignedProofStatus = 'idle' | 'loading' | 'success' | 'error';

interface SignedProofResult {
  signedUrl: string | null;
  status: SignedProofStatus;
}

export function useSignedProofUrl(proofUrl: string | null | undefined): SignedProofResult {
  const { isValid, url: safeUrl } = safeUrlRender(proofUrl);
  const normalizedProofUrl = proofUrl ?? null;
  const [result, setResult] = useState<SignedProofResult & { proofUrl: string | null }>({
    proofUrl: normalizedProofUrl,
    signedUrl: null,
    status: proofUrl ? 'loading' : 'idle',
  });

  useEffect(() => {
    let active = true;

    if (!proofUrl) {
      setResult({ proofUrl: null, signedUrl: null, status: 'idle' });
      return () => {
        active = false;
      };
    }

    if (!isValid || !safeUrl) {
      setResult({ proofUrl, signedUrl: null, status: 'error' });
      return () => {
        active = false;
      };
    }

    const filePath = safeUrl.split('/bounty-proofs/')[1];
    if (!filePath) {
      setResult({ proofUrl, signedUrl: null, status: 'error' });
      return () => {
        active = false;
      };
    }

    setResult({ proofUrl, signedUrl: null, status: 'loading' });
    void supabase.storage
      .from('bounty-proofs')
      .createSignedUrl(filePath, 3600)
      .then(({ data, error }) => {
        if (!active) return;
        setResult({
          proofUrl,
          signedUrl: data?.signedUrl ?? null,
          status: error || !data?.signedUrl ? 'error' : 'success',
        });
      })
      .catch(() => {
        if (active) {
          setResult({ proofUrl, signedUrl: null, status: 'error' });
        }
      });

    return () => {
      active = false;
    };
  }, [proofUrl, isValid, safeUrl]);

  if (result.proofUrl !== normalizedProofUrl) {
    return {
      signedUrl: null,
      status: normalizedProofUrl ? 'loading' : 'idle',
    };
  }

  return { signedUrl: result.signedUrl, status: result.status };
}

export default useSignedProofUrl;
