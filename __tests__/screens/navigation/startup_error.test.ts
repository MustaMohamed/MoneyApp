import { Strings } from '@/constants/strings';
import { resolveStartupRetryPresentation } from '@/modules/navigation/components/startup_error.helpers';

describe('resolveStartupRetryPresentation', () => {
  it('keeps retry enabled before a retry starts', () => {
    expect(resolveStartupRetryPresentation(false)).toEqual({
      label: Strings.startupErrorRetry,
      isDisabled: false,
    });
  });

  it('uses centralized loading copy and disables duplicate retries', () => {
    expect(resolveStartupRetryPresentation(true)).toEqual({
      label: Strings.loading,
      isDisabled: true,
    });
  });
});
