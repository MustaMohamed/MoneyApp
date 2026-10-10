import { Strings } from '@/constants/strings';

export function resolveDetailLoadErrorTitle(floating: boolean): string {
  return floating ? Strings.detailRefreshErrorTitle : Strings.detailLoadErrorTitle;
}

/** The first-load alert stays plain until MA-094 replaces it with the error-state block. */
export function resolveDetailLoadErrorTinted(floating: boolean): boolean {
  return floating;
}
