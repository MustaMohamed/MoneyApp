import { Strings } from '@/constants/strings';

export function resolveDetailLoadErrorTitle(floating: boolean): string {
  return floating
    ? Strings.commitmentsDetailRefreshErrorTitle
    : Strings.commitmentsDetailLoadErrorTitle;
}
