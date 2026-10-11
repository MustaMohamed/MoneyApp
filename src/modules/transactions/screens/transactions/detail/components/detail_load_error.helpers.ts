import type { LoadErrorAlertProps } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

export function resolveDetailLoadErrorTitle(floating: boolean): string {
  return floating ? Strings.detailRefreshErrorTitle : Strings.detailLoadErrorTitle;
}

const FLOATING_ALERT_PROPS = {
  mode: 'floating',
  tinted: true,
} satisfies Partial<Extract<LoadErrorAlertProps, { mode: 'floating' }>>;

// The first-load alert stays plain until MA-094 replaces it with the error-state block.
const FILL_ALERT_PROPS = {
  mode: 'fill',
  tinted: false,
} satisfies Partial<Extract<LoadErrorAlertProps, { mode?: 'fill' }>>;

export function resolveDetailLoadErrorAlertProps(
  floating: boolean,
): typeof FLOATING_ALERT_PROPS | typeof FILL_ALERT_PROPS {
  return floating ? FLOATING_ALERT_PROPS : FILL_ALERT_PROPS;
}
