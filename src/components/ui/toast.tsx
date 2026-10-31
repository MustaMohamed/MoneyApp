import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Button as HButton,
  Toast,
  ToastProvider,
  useToast as useHeroToast,
  type ToastComponentProps,
  type ToastInsets,
  type ToastProviderProps,
  type ToastShowConfig,
  type ToastShowOptions,
} from 'heroui-native';
import { useMemo, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { resolveButtonLabelStyle } from '@/components/ui/button.geometry';
import { resolveOneLineTextProps, scaledLineHeight } from '@/components/ui/text_scale.geometry';
import { TOAST_ANIMATION } from '@/components/ui/toast.anim';
import { useToastClearanceState } from '@/components/ui/toast_clearance.state';
import {
  Colors,
  HIT_SLOP_UNCLIPPED_STYLE,
  Size,
  Spacing,
  touchFloorHitSlop,
  Type,
} from '@/constants/theme';

/** One toast at a time, at the bottom — the app's only toast configuration. */
export const TOAST_PROVIDER_PROPS = {
  maxVisibleToasts: 1,
  defaultProps: { placement: 'bottom', animation: TOAST_ANIMATION },
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

/** One body line, in place of `size="sm"`'s 40 dp track, which grows the toast past G5ToastSkipped and cuts the label at 2.0. */
export function resolveToastActionHeight(fontScale: number): number {
  return scaledLineHeight(Type.body, fontScale);
}

interface SuccessActionToastProps extends ToastComponentProps {
  label: string | undefined;
  actionLabel: string;
  onActionPress: ToastShowConfig['onActionPress'];
}

function SuccessActionToast({
  label,
  actionLabel,
  onActionPress,
  ...toastProps
}: SuccessActionToastProps) {
  const { fontScale } = useWindowDimensions();
  const { id, show, hide } = toastProps;
  const height = resolveToastActionHeight(fontScale);
  const onPress = () => {
    hide(id);
    onActionPress?.({ show, hide });
  };
  return (
    <Toast {...toastProps} className="flex-row gap-3">
      <View>{SUCCESS_ICON}</View>
      <View className="flex-1">
        <Toast.Title>{label}</Toast.Title>
      </View>
      <Toast.Action
        variant="ghost"
        hitSlop={touchFloorHitSlop(height)}
        style={{
          alignSelf: 'center',
          height,
          paddingHorizontal: Spacing.xxs,
          ...HIT_SLOP_UNCLIPPED_STYLE,
        }}
        onPress={onPress}
      >
        <HButton.Label
          {...resolveOneLineTextProps(resolveButtonLabelStyle('sm', fontScale))}
          className="text-accent font-inter-semibold"
        >
          {actionLabel}
        </HButton.Label>
      </Toast.Action>
    </Toast>
  );
}

// `DefaultToast` tints a success action and greys a ghost label, so the gold action draws through its own component.
function asSuccessActionToast(config: ToastShowConfig, actionLabel: string): ToastShowOptions {
  const { id, duration, onShow, onHide, label, onActionPress } = config;
  return {
    id,
    duration,
    onShow,
    onHide,
    component: (props) => (
      <SuccessActionToast
        {...props}
        label={label}
        actionLabel={actionLabel}
        onActionPress={onActionPress}
      />
    ),
  };
}

// Rewrites `variant` to `default`, for a foreground label, and sets `icon`.
function asSuccessToast(options: string | ToastShowOptions): string | ToastShowOptions {
  if (typeof options === 'string' || options.component !== undefined) return options;
  if (options.variant !== 'success') return options;
  if (options.actionLabel !== undefined) return asSuccessActionToast(options, options.actionLabel);
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
