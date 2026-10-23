import type { LoadErrorAlertProps } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

export function resolveDetailLoadErrorTitle(floating: boolean): string {
  return floating
    ? Strings.commitmentsDetailRefreshErrorTitle
    : Strings.commitmentsDetailLoadErrorTitle;
}

// `satisfies`, since the JSX spread these reach the alert through runs no excess-key check.
const FLOATING_ALERT_PROPS = {
  mode: 'floating',
  tinted: true,
  flatRetry: true,
} satisfies Partial<Extract<LoadErrorAlertProps, { mode: 'floating' }>>;

/** `undefined` for the first load, which draws the error-state block and no alert. */
export function resolveDetailLoadErrorAlertProps(
  floating: boolean,
): typeof FLOATING_ALERT_PROPS | undefined {
  return floating ? FLOATING_ALERT_PROPS : undefined;
}
