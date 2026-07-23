import { Strings } from '@/constants/strings';

export function resolveStartupRetryPresentation(isRetrying: boolean) {
  return {
    label: isRetrying ? Strings.loading : Strings.startupErrorRetry,
    isDisabled: isRetrying,
  } as const;
}
