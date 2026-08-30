import { Strings } from '@/constants/strings';
import { resolveDetailLoadErrorTitle } from '@/modules/transactions/screens/transactions/detail/components/detail_load_error.helpers';

const ROWS = [
  [false, Strings.detailLoadErrorTitle],
  [true, Strings.detailRefreshErrorTitle],
] as const;

describe('resolveDetailLoadErrorTitle', () => {
  it.each(ROWS)('floating=%s -> its own title', (floating, expected) => {
    expect(resolveDetailLoadErrorTitle(floating)).toBe(expected);
  });

  it('the two titles are distinct', () => {
    expect(new Set(ROWS.map(([, title]) => title)).size).toBe(ROWS.length);
  });
});
