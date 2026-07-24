export type SealKind = 'accept' | 'approve' | 'paid' | 'sent-back' | 'transmit';

export interface SealEventDetail {
  id: number;
  kind: SealKind;
  x: number;
  y: number;
}

export const SEAL_EVENT = 'bh:seal';
let sealSequence = 0;

export function fireSeal(kind: SealKind, anchor?: Element | null): void {
  if (typeof window === 'undefined') return;
  const rect = anchor?.getBoundingClientRect();
  window.dispatchEvent(new CustomEvent<SealEventDetail>(SEAL_EVENT, {
    detail: {
      id: ++sealSequence,
      kind,
      x: rect && rect.width > 0 ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect && rect.height > 0 ? rect.top + rect.height / 2 : window.innerHeight / 2,
    },
  }));
}
