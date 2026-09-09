import { ToastProvider, type ToastProviderProps } from 'heroui-native';
import type { ReactNode } from 'react';

/** One toast at a time, at the bottom — the app's only toast configuration. */
export const TOAST_PROVIDER_PROPS = {
  maxVisibleToasts: 1,
  defaultProps: { placement: 'bottom' },
} satisfies ToastProviderProps;

export function AppToastProvider({ children }: { children: ReactNode }) {
  return <ToastProvider {...TOAST_PROVIDER_PROPS}>{children}</ToastProvider>;
}

// Re-exported so no screen reaches past this wrapper for the toast.
export { useToast } from 'heroui-native';
