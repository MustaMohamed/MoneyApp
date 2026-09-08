import { Alert } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';

type LoadErrorAlertFloatingOffset = 'tabBar' | 'edge';
type LoadErrorAlertFillPadding = 'default' | 'wide';

interface LoadErrorAlertCommonProps {
  title: string;
  onRetry: () => void;
  /** Required, not defaulted: no shared retry key exists; every caller names its own. */
  retryLabel: string;
  /** The redesigned screens' flat secondary on the retry; every other render site stays bordered. */
  flatRetry?: boolean;
  testID?: string;
}

export type LoadErrorAlertProps =
  | (LoadErrorAlertCommonProps & {
      mode?: 'fill';
      fillPadding?: LoadErrorAlertFillPadding;
      minHeight?: number;
    })
  | (LoadErrorAlertCommonProps & {
      mode: 'inline';
    })
  | (LoadErrorAlertCommonProps & {
      mode: 'floating';
      floatingOffset?: LoadErrorAlertFloatingOffset;
      minHeight?: number;
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

export function LoadErrorAlert(props: LoadErrorAlertProps) {
  const { title, onRetry, retryLabel, flatRetry, testID } = props;

  // Two literals, not `flat={flatRetry}`: `ButtonProps` discriminates on `flat: true`.
  const retryButton = flatRetry ? (
    <Button
      variant="secondary"
      flat
      size="sm"
      label={retryLabel}
      accessibilityLabel={retryLabel}
      onPress={onRetry}
    />
  ) : (
    <Button
      variant="secondary"
      size="sm"
      label={retryLabel}
      accessibilityLabel={retryLabel}
      onPress={onRetry}
    />
  );

  const alert = (
    <Alert status="danger" className="w-full">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
      </Alert.Content>
      {retryButton}
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
