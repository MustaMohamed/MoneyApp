import { useFocusEffect } from 'expo-router';
import { Alert, type ButtonSize } from 'heroui-native';
import { useCallback, useRef, type ReactNode } from 'react';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  resolveFloatingAlertToastClearance,
  resolveLoadErrorAlertTone,
  resolveLoadErrorRetryHitSlop,
  type LoadErrorAlertTone,
} from '@/components/ui/load_error_alert.geometry';
import { resolveStateScreenBottomReserve } from '@/components/ui/state_screen.geometry';
import { resolveRowStacking } from '@/components/ui/text_scale.geometry';
import { holdAlertToastClearance } from '@/components/ui/toast_clearance.state';
import { Colors, Radius, Spacing, Type, lineHeightFor } from '@/constants/theme';

type LoadErrorAlertFloatingOffset = 'tabBar' | 'edge';
type LoadErrorAlertFillPadding = 'default' | 'wide';

interface LoadErrorAlertCommonProps {
  title: string;
  onRetry: () => void;
  /** Required, not defaulted: no shared retry key exists; every caller names its own. */
  retryLabel: string;
  /** The redesigned screens' flat secondary on the retry; every other render site stays bordered. */
  flatRetry?: boolean;
  retrySize?: ButtonSize;
  retryDisabled?: boolean;
  /** The transactions screens' danger-tinted box; absent draws the plain alert. */
  tinted?: boolean;
  testID?: string;
}

export type LoadErrorAlertProps =
  | (LoadErrorAlertCommonProps & {
      mode?: 'fill';
      fillPadding?: LoadErrorAlertFillPadding;
      minHeight?: number;
      /** A tab screen's state that does not scroll: centres above the + button. */
      clearsFab?: boolean;
    })
  | (LoadErrorAlertCommonProps & {
      mode: 'inline';
    })
  | (LoadErrorAlertCommonProps & {
      mode: 'floating';
      floatingOffset?: LoadErrorAlertFloatingOffset;
      minHeight?: number;
    })
  | (LoadErrorAlertCommonProps & {
      /** The alert alone, inside a box its caller owns, so it takes no `testID`. */
      mode: 'bare';
      testID?: never;
    });

// Tailwind resolves at build time, so every class a map can return must be a complete literal.
const FILL_CLASS_NAME: Record<LoadErrorAlertFillPadding, string> = {
  default: 'items-center justify-center px-4',
  wide: 'items-center justify-center px-6',
};

const FLOATING_CLASS_NAME: Record<LoadErrorAlertFloatingOffset, string> = {
  tabBar: 'absolute right-4 bottom-24 left-4 z-50',
  edge: 'absolute right-4 bottom-4 left-4 z-50',
};

const INLINE_CLASS_NAME = 'px-4 py-3';

const ALERT_CLASS_NAME: Record<LoadErrorAlertTone, string> = {
  plain: 'w-full',
  tint: 'w-full bg-transparent',
  tintOverSurface: 'w-full',
};

// The frames' `.alrt` centres the row; stacked, the icon stays beside the first line.
const ALERT_ROW_CLASS_NAME: Record<LoadErrorAlertTone, string> = {
  plain: 'w-full',
  tint: 'w-full items-center bg-transparent',
  tintOverSurface: 'w-full items-center',
};

const TINT_CORNERS = { borderRadius: Radius.md } as const;

// `shadow-none` cannot override HeroUI's shadow token, and a shadow would read through the tint.
const ALERT_STYLE: Record<LoadErrorAlertTone, ViewStyle | undefined> = {
  plain: undefined,
  tint: { ...TINT_CORNERS, boxShadow: 'none' },
  tintOverSurface: TINT_CORNERS,
};

const TINT_BACKGROUND_CLASS_NAME = 'border border-danger/30 bg-danger/12';
const TINT_ICON_PROPS = { color: Colors.dark.negative } as const;
// HeroUI pads the icon 3.5 down to meet a top-aligned first line; a centred row takes none.
const CENTRED_INDICATOR_CLASS_NAME = 'pt-0';
const TINT_TITLE_CLASS_NAME = 'font-inter-semibold text-foreground';
const TINT_TITLE_STYLE = { fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) } as const;

interface FloatingAlertFrameProps {
  floatingOffset: LoadErrorAlertFloatingOffset;
  minHeight: number | undefined;
  testID: string | undefined;
  children: ReactNode;
}

// Only the floating arm mounts this, so no other mode calls a navigation hook.
function FloatingAlertFrame({
  floatingOffset,
  minHeight,
  testID,
  children,
}: FloatingAlertFrameProps) {
  const { height: windowHeight } = useWindowDimensions();
  const frameRef = useRef<View>(null);
  const holdRef = useRef<{ focused: boolean; release: (() => void) | undefined }>({
    focused: false,
    release: undefined,
  });

  const holdClearance = useCallback(() => {
    frameRef.current?.measureInWindow((_left, top) => {
      const hold = holdRef.current;
      if (!hold.focused) return;
      // A new hold takes the owner slot, so the release it replaces is already dead.
      hold.release = holdAlertToastClearance(resolveFloatingAlertToastClearance(windowHeight, top));
    });
  }, [windowHeight]);

  useFocusEffect(
    useCallback(() => {
      const hold = holdRef.current;
      hold.focused = true;
      holdClearance();
      return () => {
        hold.focused = false;
        hold.release?.();
        hold.release = undefined;
      };
    }, [holdClearance]),
  );

  return (
    <View
      ref={frameRef}
      testID={testID}
      onLayout={holdClearance}
      style={{ minHeight }}
      className={FLOATING_CLASS_NAME[floatingOffset]}
    >
      {children}
    </View>
  );
}

export function LoadErrorAlert(props: LoadErrorAlertProps) {
  const { fontScale } = useWindowDimensions();
  const bottomReserve = resolveStateScreenBottomReserve(fontScale);
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const {
    title,
    onRetry,
    retryLabel,
    flatRetry,
    retrySize = 'sm',
    retryDisabled = false,
    tinted = false,
    testID,
  } = props;
  const tone = resolveLoadErrorAlertTone(props.mode ?? 'fill', tinted);
  const retryHitSlop = resolveLoadErrorRetryHitSlop(retrySize, fontScale, tinted);

  // Two literals, not `flat={flatRetry}`: `ButtonProps` discriminates on `flat: true`.
  const retryButton = flatRetry ? (
    <Button
      variant="secondary"
      flat
      size={retrySize}
      label={retryLabel}
      accessibilityLabel={retryLabel}
      isDisabled={retryDisabled}
      hitSlop={retryHitSlop}
      onPress={onRetry}
    />
  ) : (
    <Button
      variant="secondary"
      size={retrySize}
      label={retryLabel}
      accessibilityLabel={retryLabel}
      isDisabled={retryDisabled}
      hitSlop={retryHitSlop}
      onPress={onRetry}
    />
  );

  // On the background layer the border adds nothing to the box, so the tint moves no row.
  const tintBackground =
    tone === 'plain' ? undefined : (
      <Alert.Background className={TINT_BACKGROUND_CLASS_NAME} style={TINT_CORNERS} />
    );

  const alert = (
    <Alert
      status="danger"
      className={(stacked ? ALERT_CLASS_NAME : ALERT_ROW_CLASS_NAME)[tone]}
      style={ALERT_STYLE[tone]}
      background={tintBackground}
    >
      <Alert.Indicator
        className={tone === 'plain' || stacked ? undefined : CENTRED_INDICATOR_CLASS_NAME}
        iconProps={tone === 'plain' ? undefined : TINT_ICON_PROPS}
      />
      <Alert.Content>
        <Alert.Title
          className={tone === 'plain' ? undefined : TINT_TITLE_CLASS_NAME}
          style={tone === 'plain' ? undefined : TINT_TITLE_STYLE}
        >
          {title}
        </Alert.Title>
        {stacked ? (
          <View style={{ alignSelf: 'flex-start', marginTop: Spacing.xs }}>{retryButton}</View>
        ) : null}
      </Alert.Content>
      {stacked ? null : retryButton}
    </Alert>
  );

  if (props.mode === 'bare') return alert;

  if (props.mode === 'inline') {
    return (
      <View testID={testID} className={INLINE_CLASS_NAME}>
        {alert}
      </View>
    );
  }

  if (props.mode === 'floating') {
    return (
      <FloatingAlertFrame
        floatingOffset={props.floatingOffset ?? 'edge'}
        minHeight={props.minHeight}
        testID={testID}
      >
        {alert}
      </FloatingAlertFrame>
    );
  }

  const fillPadding = props.fillPadding ?? 'default';
  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        minHeight: props.minHeight,
        paddingBottom: props.clearsFab === true ? bottomReserve : undefined,
      }}
      className={FILL_CLASS_NAME[fillPadding]}
    >
      {alert}
    </View>
  );
}
