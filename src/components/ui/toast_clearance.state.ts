import { create } from 'zustand';

interface ToastClearanceStateShape {
  bottomClearance: number | undefined;
  alertClearance: number | undefined;
  alertOwner: number | undefined;
}

type ToastClearanceState = ToastClearanceStateShape & {
  publish: (px: number) => void;
  clear: () => void;
  /** Returns the owner it set, the token `releaseAlert` checks. */
  holdAlert: (px: number) => number;
  releaseAlert: (owner: number) => void;
  reset: () => void;
};

const INITIAL_STATE: ToastClearanceStateShape = {
  bottomClearance: undefined,
  alertClearance: undefined,
  alertOwner: undefined,
};

// Outside the state, so `reset` never hands a live release's owner to a later hold.
let lastAlertOwner = 0;

export const useToastClearanceState = create<ToastClearanceState>((set) => ({
  ...INITIAL_STATE,
  publish: (px) => set({ bottomClearance: px }),
  clear: () => set({ bottomClearance: undefined }),
  holdAlert: (px) => {
    lastAlertOwner += 1;
    const owner = lastAlertOwner;
    set({ alertClearance: px, alertOwner: owner });
    return owner;
  },
  // Two tab screens can each float an alert, and focus on the next can fire before blur on the last.
  releaseAlert: (owner) =>
    set((state) =>
      state.alertOwner === owner ? { alertClearance: undefined, alertOwner: undefined } : state,
    ),
  reset: () => set(INITIAL_STATE),
}));

export function holdToastClearance(px: number): () => void {
  const { publish, clear } = useToastClearanceState.getState();
  publish(px);
  return clear;
}

export function holdAlertToastClearance(px: number): () => void {
  const { holdAlert, releaseAlert } = useToastClearanceState.getState();
  const owner = holdAlert(px);
  return () => releaseAlert(owner);
}
