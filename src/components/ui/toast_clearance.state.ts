import { create } from 'zustand';

interface ToastClearanceStateShape {
  bottomClearance: number | undefined;
}

type ToastClearanceState = ToastClearanceStateShape & {
  publish: (px: number) => void;
  clear: () => void;
  reset: () => void;
};

const INITIAL_STATE: ToastClearanceStateShape = { bottomClearance: undefined };

export const useToastClearanceState = create<ToastClearanceState>((set) => ({
  ...INITIAL_STATE,
  publish: (px) => set({ bottomClearance: px }),
  clear: () => set({ bottomClearance: undefined }),
  reset: () => set(INITIAL_STATE),
}));

// The install/remove pair a focus effect returns: publish now, clear on blur.
export function holdToastClearance(px: number): () => void {
  const { publish, clear } = useToastClearanceState.getState();
  publish(px);
  return clear;
}
