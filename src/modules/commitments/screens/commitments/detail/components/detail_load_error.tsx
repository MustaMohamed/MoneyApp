import { LoadErrorAlert, type LoadErrorAlertProps } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

export type DetailLoadErrorFloatingOffset = NonNullable<
  Extract<LoadErrorAlertProps, { mode: 'floating' }>['floatingOffset']
>;

interface DetailLoadErrorProps {
  floating?: boolean;
  floatingOffset?: DetailLoadErrorFloatingOffset;
  onRetry: () => void;
}

export function DetailLoadError({
  floating = false,
  floatingOffset,
  onRetry,
}: DetailLoadErrorProps): React.ReactElement {
  const common = {
    retryLabel: Strings.commitmentsLoadRetry,
    onRetry,
    testID: 'commitment-detail-load-error',
  };
  return floating ? (
    <LoadErrorAlert
      {...common}
      mode="floating"
      floatingOffset={floatingOffset}
      title={Strings.commitmentsDetailRefreshErrorTitle}
    />
  ) : (
    <LoadErrorAlert {...common} mode="fill" title={Strings.commitmentsDetailLoadErrorTitle} />
  );
}
