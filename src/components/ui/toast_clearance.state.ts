import { create } from 'zustand';

interface ToastClearanceStateShape {
  bottomClearance: number | undefined;
  alertClearance: number | undefined;
  alertOwner: number | undefined;
}

type ToastClearanceState = ToastClearanceStateShape & {
  publish: (px: number) => void;
  clear: () => void;
  holdAlert: (px: number, owner: number) => void;
  releaseAlert: (owner: number) => void;
  reset: () => void;
};

const INITIAL_STATE: ToastClearanceStateShape = {
  bottomClearance: undefined,
  alertClearance: undefined,
  alertOwner: undefined,
};

export const useToastClearanceState = create<ToastClearanceState>((set) => ({
  ...INITIAL_STATE,
  publish: (px) => set({ bottomClearance: px }),
  clear: () => set({ bottomClearance: undefined }),
  holdAlert: (px, owner) => set({ alertClearance: px, alertOwner: owner }),
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

let lastAlertOwner = 0;

export function holdAlertToastClearance(px: number): () => void {
  lastAlertOwner += 1;
  const owner = lastAlertOwner;
  const { holdAlert, releaseAlert } = useToastClearanceState.getState();
  holdAlert(px, owner);
  return () => releaseAlert(owner);
}

export function resolveToastBottomClearance(
  bottomClearance: number | undefined,
  alertClearance: number | undefined,
): number | undefined {
  if (bottomClearance === undefined) return alertClearance;
  if (alertClearance === undefined) return bottomClearance;
  return Math.max(bottomClearance, alertClearance);
}
