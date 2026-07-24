// Mission evidence dossier: written report plus private inline proof media.

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AssignedContract } from '../hooks/useAssignedContracts';
import { useSignedProofUrl } from '../hooks/useSignedProofUrl';

interface EvidencePanelProps {
  task: AssignedContract;
}

type ProofKind = 'image' | 'video' | 'pdf' | 'other';

function getProofKind(task: AssignedContract): ProofKind {
  if (task.proof_type === 'image') return 'image';
  if (task.proof_type === 'video') return 'video';
  if (task.proof_type === 'document') return 'pdf';

  const path = task.proof_url?.split('?')[0].toLowerCase() ?? '';
  if (/\.(jpe?g|png|gif|webp)$/.test(path)) return 'image';
  if (/\.(mp4|mov|webm)$/.test(path)) return 'video';
  if (path.endsWith('.pdf')) return 'pdf';
  return 'other';
}

export function EvidencePanel({ task }: EvidencePanelProps) {
  const { t } = useTranslation();
  const report = task.proof_description?.trim() ?? '';
  const { signedUrl, status } = useSignedProofUrl(task.proof_url);
  const [inlineFailed, setInlineFailed] = useState(false);
  const proofKind = useMemo(() => getProofKind(task), [task]);

  useEffect(() => {
    setInlineFailed(false);
  }, [task.proof_url]);

  const externalProofLink = signedUrl ? (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('contracts.evidence.openProof')}
      className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-teal-400 transition-colors hover:bg-teal-500/10 hover:text-teal-300"
    >
      <ExternalLink size={18} />
      {t('contracts.evidence.openProof')}
    </a>
  ) : null;

  return (
    <section
      aria-label={t('contracts.evidence.title')}
      className="mt-4 space-y-4 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
        {t('contracts.evidence.title')}
      </h3>

      {report && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-300">
            {t('contracts.evidence.hunterReport')}
          </h4>
          <blockquote className="border-l-2 border-orange-400/60 pl-4 text-sm italic leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
            {report}
          </blockquote>
        </div>
      )}

      {task.proof_url && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-white/60">
            {t('contracts.evidence.submittedProof')}
          </h4>

          {status === 'loading' && (
            <p role="status" className="text-sm text-white/50">
              {t('contracts.evidence.loadingProof')}
            </p>
          )}

          {status === 'error' && (
            <p className="text-sm text-orange-300">
              {t('contracts.evidence.proofUnavailable')}
            </p>
          )}

          {status === 'success' && signedUrl && (
            <>
              {proofKind === 'image' && !inlineFailed && (
                <img
                  src={signedUrl}
                  alt={t('contracts.evidence.submittedProofAlt')}
                  className="max-h-[28rem] w-full rounded-lg border border-white/10 bg-black/20 object-contain"
                  onError={() => setInlineFailed(true)}
                />
              )}

              {proofKind === 'video' && !inlineFailed && (
                <video
                  src={signedUrl}
                  playsInline
                  controls
                  aria-label={t('contracts.evidence.submittedVideo')}
                  className="max-h-[28rem] w-full rounded-lg border border-white/10 bg-black"
                  onError={() => setInlineFailed(true)}
                />
              )}

              {proofKind === 'pdf' && (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('contracts.evidence.openPdf')}
                  className="flex items-center gap-3 rounded-lg border border-white/15 bg-black/20 p-4 text-left transition-colors hover:border-teal-400/50 hover:bg-teal-500/10"
                >
                  <FileText size={28} className="text-orange-300" />
                  <span>
                    <span className="block text-sm font-semibold text-white">
                      {t('contracts.evidence.pdfProof')}
                    </span>
                    <span className="block text-xs text-teal-400">
                      {t('contracts.evidence.openPdf')}
                    </span>
                  </span>
                </a>
              )}

              {(proofKind === 'other' || inlineFailed) && externalProofLink}
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default EvidencePanel;
