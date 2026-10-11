import { blank } from './forms';
import { draftKey, memberStore } from './memberAuth';

export function restoreDraft(saved: any, sections: number) {
  if (
    !saved ||
    saved.version !== 1 ||
    !saved.values ||
    typeof saved.values !== 'object' ||
    Array.isArray(saved.values)
  )
    return null;
  const values = { ...blank(), ...saved.values, consent: false };
  for (const key of [
    'taluk',
    'talukCode',
    'talukChoiceId',
    'streetArea',
    'streetChoiceId',
  ])
    delete values[key];
  const step = Number.isInteger(saved.step)
    ? Math.max(0, Math.min(sections, saved.step))
    : 0;
  // Preserve a completed submission across restart, without exposing an expired receipt.
  const receipt =
    saved.receipt && saved.receiptExpiresAt > Date.now() ? saved.receipt : null;
  return {
    values: saved.receipt ? blank() : values,
    step: saved.receipt ? 0 : step,
    receipt,
    receiptExpiresAt: saved.receiptExpiresAt,
  };
}
export const drafts = {
  read: (uid: string, slug: string) => memberStore.read(draftKey(uid, slug)),
  save: (
    uid: string,
    slug: string,
    values: any,
    step: number,
    receipt: any,
    receiptExpiresAt: number,
  ) =>
    memberStore.save(draftKey(uid, slug), {
      version: 1,
      values: receipt ? {} : values,
      step,
      receipt,
      receiptExpiresAt,
    }),
};
