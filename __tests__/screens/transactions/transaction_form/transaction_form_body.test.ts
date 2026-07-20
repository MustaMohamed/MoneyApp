jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@gorhom/bottom-sheet', () => ({ BottomSheetScrollView: () => null }));
jest.mock('heroui-native', () => ({
  Input: () => null,
  PressableFeedback: () => null,
  Spinner: () => null,
}));
jest.mock('@/components/account_type_pill', () => ({ TYPE_OPTIONS: [] }));
jest.mock('@/components/ui/sheet', () => ({ SHEET_FOOTER_CLEARANCE: 777 }));
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/amount_hero',
  () => ({ AmountHero: () => null }),
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/date_row',
  () => ({ DateRow: () => null }),
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row',
  () => ({ ExchangeRateRow: () => null }),
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/type_tabs',
  () => ({ TypeTabs: () => null }),
);

import { TRANSACTION_FORM_CONTENT_CONTAINER_STYLE } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body';

describe('TransactionFormBody geometry', () => {
  it('reserves the shared sticky-footer clearance below the last field', () => {
    expect(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE.paddingBottom).toBe(777);
  });
});
