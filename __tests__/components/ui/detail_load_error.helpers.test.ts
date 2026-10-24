import {
  resolveDetailLoadErrorAlertProps,
  resolveDetailLoadErrorTitle,
} from '@/components/ui/detail_load_error.helpers';
import { Strings } from '@/constants/strings';
import { COMMITMENT_DETAIL_LOAD_ERROR_COPY as COMMITMENT_COPY } from '@/modules/commitments/screens/commitments/detail/detail.helpers';
import { TRANSACTION_DETAIL_LOAD_ERROR_COPY as TRANSACTION_COPY } from '@/modules/transactions/screens/transactions/detail/detail.helpers';

const ROWS = [
  ['transaction', false, TRANSACTION_COPY, Strings.detailLoadErrorTitle],
  ['transaction', true, TRANSACTION_COPY, Strings.detailRefreshErrorTitle],
  ['commitment', false, COMMITMENT_COPY, Strings.commitmentsDetailLoadErrorTitle],
  ['commitment', true, COMMITMENT_COPY, Strings.commitmentsDetailRefreshErrorTitle],
] as const;

describe('resolveDetailLoadErrorTitle', () => {
  it.each(ROWS)('%s detail, floating=%s -> its own title', (_detail, floating, copy, expected) => {
    expect(resolveDetailLoadErrorTitle(floating, copy)).toBe(expected);
  });

  it('the four titles are distinct', () => {
    expect(new Set(ROWS.map(([, , , title]) => title)).size).toBe(ROWS.length);
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
