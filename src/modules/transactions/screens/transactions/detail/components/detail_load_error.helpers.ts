import { Strings } from '@/constants/strings';

export function resolveDetailLoadErrorTitle(floating: boolean): string {
  return floating ? Strings.detailRefreshErrorTitle : Strings.detailLoadErrorTitle;
}
