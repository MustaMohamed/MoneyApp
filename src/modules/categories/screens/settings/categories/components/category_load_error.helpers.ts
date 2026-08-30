import { Strings } from '@/constants/strings';

export function resolveCategoryLoadErrorTitle(floating: boolean): string {
  return floating ? Strings.categoriesRefreshError : Strings.categoriesLoadError;
}
