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

/** One instance per onboarding screen; a shared slot cross-clobbers during a route replace. */
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
