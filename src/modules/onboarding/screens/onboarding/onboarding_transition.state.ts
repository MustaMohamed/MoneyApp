import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface OnboardingTransitionStateShape {
  statusMessage: string;
  busy: boolean;
}

const INITIAL_STATE: OnboardingTransitionStateShape = {
  statusMessage: '',
  busy: false,
};

export type OnboardingTransitionState = OnboardingTransitionStateShape & {
  /** Re-entry guard, in one place: null while a transition is already in flight. */
  begin: () => number | null;
  isCurrent: (session: number) => boolean;
  fail: (session: number, message: string) => void;
  settle: (session: number) => void;
  invalidate: () => void;
  reset: () => void;
};

/**
 * One instance per onboarding screen — never a single shared slot. During a
 * `replace` the outgoing and incoming routes are briefly both mounted, and a
 * shared slot written by more than one screen is the single-owner-lookup
 * defect `.claude/rules/state.md` calls out (audit L27). Shaped like
 * `src/modules/currency/screens/currency/currency.state.ts`: module factory +
 * `createMoneyAppSelectors` + `create`, with the monotonic counter living in
 * the factory's closure rather than in reactive state.
 */
export function createOnboardingTransitionState() {
  let session = 0;

  return createMoneyAppSelectors(
    create<OnboardingTransitionState>((set, get) => ({
      ...INITIAL_STATE,

      begin: () => {
        if (get().busy) return null;
        session += 1;
        set({ busy: true, statusMessage: '' });
        return session;
      },

      isCurrent: (s) => s === session,

      fail: (s, message) => {
        if (s !== session) return;
        set({ busy: false, statusMessage: message });
      },

      settle: (s) => {
        if (s !== session) return;
        set({ busy: false });
      },

      invalidate: () => {
        session += 1;
        set(INITIAL_STATE);
      },

      reset: () => {
        session += 1;
        set(INITIAL_STATE);
      },
    })),
  );
}
