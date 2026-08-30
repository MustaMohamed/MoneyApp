import { Alert } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';

export type LoadErrorAlertMode = 'fill' | 'inline' | 'floating';
export type LoadErrorAlertFloatingOffset = 'tabBar' | 'edge';
/** Semantic keys, not the Tailwind classes themselves — `status_badge.tsx`'s
 * `size?: 'sm' | 'md'` is the house precedent for this exact class-map shape. */
export type LoadErrorAlertFillPadding = 'default' | 'wide';

interface LoadErrorAlertCommonProps {
  title: string;
  onRetry: () => void;
  /** Required, not defaulted: #290's four extracted components and five inline
   * sites carried seven different per-screen retry keys (six `'Retry'`, one
   * `'Try again'`) and no shared key exists to fall back to — every caller
   * names its own Strings entry. */
  retryLabel: string;
  testID?: string;
}

/**
 * Discriminated on `mode` so each mode's own props aren't reachable from the
 * others — `mode="inline"` can no longer be given a `floatingOffset` or a
 * `fillPadding` that silently does nothing.
 */
export type LoadErrorAlertProps =
  | (LoadErrorAlertCommonProps & {
      mode?: 'fill';
      fillPadding?: LoadErrorAlertFillPadding;
      /** Wrapper `minHeight` slot; every fill-mode caller today omits it. */
      minHeight?: number;
    })
  | (LoadErrorAlertCommonProps & {
      mode: 'inline';
    })
  | (LoadErrorAlertCommonProps & {
      mode: 'floating';
      floatingOffset?: LoadErrorAlertFloatingOffset;
      /** Wrapper `minHeight` slot two floating sites (commitments, budget)
       * carry to reserve room under the tab bar; every other caller omits it. */
      minHeight?: number;
    });

// Full-literal class maps, never an interpolated className — Tailwind is
// resolved at build time by Uniwind (ui.md:11), so every string the classes
// can resolve to has to appear in source as a complete literal.
const FILL_CLASS_NAME: Record<LoadErrorAlertFillPadding, string> = {
  default: 'items-center justify-center px-4',
  wide: 'items-center justify-center px-6',
};

const FLOATING_CLASS_NAME: Record<LoadErrorAlertFloatingOffset, string> = {
  tabBar: 'absolute right-4 bottom-24 left-4 z-50',
  edge: 'absolute right-4 bottom-4 left-4 z-50',
};

const INLINE_CLASS_NAME = 'px-4 py-3';

/**
 * The one load-error presentation behind all nine copies #290 found (four
 * extracted per-screen components, five inline call sites). Every caller
 * keeps its own title text and retry callback — this component owns only the
 * shared chrome: the HeroUI `Alert` + project `Button`, and which of the
 * three wrapper shapes screen topology calls for.
 *
 * Fill-mode normalization: of the seven copies that render in `mode="fill"`
 * at all, five used className `flex-1`, two already used a `style` object,
 * and one (the transaction-form site) omitted `items-center`. All now take
 * `style={{ flex: 1 }}` per ui.md:22 ("use style for layout-critical
 * containers; keep className for colors, padding, gap, typography"). Adding
 * `items-center` to the one site that lacked it is a no-op there — the Alert
 * underneath is `w-full` either way — on the device-QA walk regardless.
 */
export function LoadErrorAlert(props: LoadErrorAlertProps) {
  const { title, onRetry, retryLabel, testID } = props;

  const alert = (
    <Alert status="danger" className="w-full">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
      </Alert.Content>
      <Button
        variant="secondary"
        size="sm"
        label={retryLabel}
        accessibilityLabel={retryLabel}
        onPress={onRetry}
      />
    </Alert>
  );

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
      style={{ flex: 1, minHeight: props.minHeight }}
      className={FILL_CLASS_NAME[fillPadding]}
    >
      {alert}
    </View>
  );
}
