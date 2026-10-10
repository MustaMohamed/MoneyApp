import { Alert, type ButtonSize } from 'heroui-native';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  resolveLoadErrorAlertTone,
  resolveLoadErrorRetryHitSlop,
  type LoadErrorAlertTone,
} from '@/components/ui/load_error_alert.geometry';
import { resolveStateScreenBottomReserve } from '@/components/ui/state_screen.geometry';
import { resolveRowStacking } from '@/components/ui/text_scale.geometry';
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

const TINT_CORNERS = { borderRadius: Radius.md } as const;

// `shadow-none` cannot override HeroUI's shadow token, and a shadow would read through the tint.
const ALERT_STYLE: Record<LoadErrorAlertTone, ViewStyle | undefined> = {
  plain: undefined,
  tint: { ...TINT_CORNERS, boxShadow: 'none' },
  tintOverSurface: TINT_CORNERS,
};

const TINT_BACKGROUND_CLASS_NAME = 'border border-danger/30 bg-danger/12';
const TINT_ICON_PROPS = { color: Colors.dark.negative } as const;
const TINT_TITLE_CLASS_NAME = 'font-inter-semibold text-foreground';
const TINT_TITLE_STYLE = { fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) } as const;

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
      className={ALERT_CLASS_NAME[tone]}
      style={ALERT_STYLE[tone]}
      background={tintBackground}
    >
      <Alert.Indicator iconProps={tone === 'plain' ? undefined : TINT_ICON_PROPS} />
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
    const floatingOffset = props.floatingOffset ?? 'edge';
    return (
      <View
        testID={testID}
        style={{ minHeight: props.minHeight }}
        className={FLOATING_CLASS_NAME[floatingOffset]}
      >
        {alert}
      </View>
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
