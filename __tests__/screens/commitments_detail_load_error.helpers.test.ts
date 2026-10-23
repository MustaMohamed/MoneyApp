import { Strings } from '@/constants/strings';
import {
  resolveDetailLoadErrorAlertProps,
  resolveDetailLoadErrorTitle,
} from '@/modules/commitments/screens/commitments/detail/components/detail_load_error.helpers';

const ROWS = [
  [false, Strings.commitmentsDetailLoadErrorTitle],
  [true, Strings.commitmentsDetailRefreshErrorTitle],
] as const;

describe('resolveDetailLoadErrorTitle', () => {
  it.each(ROWS)('floating=%s -> its own title', (floating, expected) => {
    expect(resolveDetailLoadErrorTitle(floating)).toBe(expected);
  });

  it('the two titles are distinct', () => {
    expect(new Set(ROWS.map(([, title]) => title)).size).toBe(ROWS.length);
  });
});

describe('resolveDetailLoadErrorAlertProps', () => {
  it('floats the refresh alert, tinted, with the flat retry', () => {
    expect(resolveDetailLoadErrorAlertProps(true)).toStrictEqual({
      mode: 'floating',
      tinted: true,
      flatRetry: true,
    });
  });

  it('draws no alert on the first load, which takes the flat error block', () => {
    expect(resolveDetailLoadErrorAlertProps(false)).toBeUndefined();
  });
});
