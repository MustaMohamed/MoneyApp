import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  ToastProvider,
  useToast as useHeroToast,
  type ToastInsets,
  type ToastProviderProps,
  type ToastShowOptions,
} from 'heroui-native';
import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';

import { useToastClearanceState } from '@/components/ui/toast_clearance.state';
import { Colors, Size } from '@/constants/theme';

/** One toast at a time, at the bottom — the app's only toast configuration. */
export const TOAST_PROVIDER_PROPS = {
  maxVisibleToasts: 1,
  defaultProps: { placement: 'bottom' },
} satisfies ToastProviderProps;

// Undefined keeps HeroUI's safe-area default, the position on a screen without the tab bar.
export function resolveToastInsets(bottomClearance: number | undefined): ToastInsets | undefined {
  return bottomClearance === undefined ? undefined : { bottom: bottomClearance };
}

/** The larger of the tab bar's clearance and a floating alert's; `undefined` when neither holds. */
export function resolveToastBottomClearance(
  bottomClearance: number | undefined,
  alertClearance: number | undefined,
): number | undefined {
  if (bottomClearance === undefined) return alertClearance;
  if (alertClearance === undefined) return bottomClearance;
  return Math.max(bottomClearance, alertClearance);
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const bottomClearance = useToastClearanceState((state) =>
    resolveToastBottomClearance(state.bottomClearance, state.alertClearance),
  );
  return (
    <ToastProvider {...TOAST_PROVIDER_PROPS} insets={resolveToastInsets(bottomClearance)}>
      {children}
    </ToastProvider>
  );
}

// DefaultToast stretches the icon slot to the row's height, so the glyph centres itself.
const SUCCESS_ICON = (
  <View style={{ flex: 1, justifyContent: 'center' }}>
    <MaterialCommunityIcons
      name="check-circle"
      size={Size.toastIcon}
      color={Colors.dark.positive}
    />
  </View>
);

// Rewrites `variant` to `default`, for a foreground label, and sets `icon`; a success toast with an action would lose the success action background.
function asSuccessToast(options: string | ToastShowOptions): string | ToastShowOptions {
  if (typeof options === 'string' || options.component !== undefined) return options;
  if (options.variant !== 'success') return options;
  return { ...options, variant: 'default', icon: options.icon ?? SUCCESS_ICON };
}

// HeroUI takes `icon` and `variant` per call only, so every success toast is rewritten here and no screen reaches past this.
export function useToast(): ReturnType<typeof useHeroToast> {
  const { toast: heroToast, isToastVisible } = useHeroToast();
  const toast = useMemo(
    () => ({
      show: (options: string | ToastShowOptions) => heroToast.show(asSuccessToast(options)),
      hide: heroToast.hide,
    }),
    [heroToast],
  );
  return { toast, isToastVisible };
}
