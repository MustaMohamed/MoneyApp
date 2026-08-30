import { Strings } from '@/constants/strings';
import { resolveDashboardLoadErrorTitle } from '@/modules/dashboard/screens/dashboard/components/dashboard_load_error.helpers';

const ROWS = [
  ['initial', Strings.dashboardLoadError],
  ['refresh', Strings.dashboardRefreshError],
] as const;

describe('resolveDashboardLoadErrorTitle', () => {
  it.each(ROWS)('%s -> its own title', (variant, expected) => {
    expect(resolveDashboardLoadErrorTitle(variant)).toBe(expected);
  });

  it('the two titles are distinct', () => {
    expect(new Set(ROWS.map(([, title]) => title)).size).toBe(ROWS.length);
  });
});
