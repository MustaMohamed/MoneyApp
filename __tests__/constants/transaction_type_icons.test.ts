import { TransactionType } from '@/constants/enums';
import { AccentCCTokens, InfoTokens, SemanticTokens } from '@/constants/theme_tokens';
import { TRANSACTION_TYPE_ICONS } from '@/constants/transaction_type_icons';

describe('TRANSACTION_TYPE_ICONS', () => {
  it('carries exactly one entry per transaction type', () => {
    expect(Object.keys(TRANSACTION_TYPE_ICONS).sort()).toEqual(
      Object.values(TransactionType).sort(),
    );
  });

  it.each<[TransactionType, string, string]>([
    [TransactionType.Income, 'arrow-down-circle-outline', SemanticTokens.positive],
    [TransactionType.Expense, 'arrow-up-circle-outline', SemanticTokens.negative],
    [TransactionType.Transfer, 'swap-horizontal', InfoTokens[500]],
    [TransactionType.CCPayment, 'credit-card-refund', AccentCCTokens[500]],
  ])('draws %s with the list set glyph and token colour', (type, name, color) => {
    expect(TRANSACTION_TYPE_ICONS[type]).toEqual({ name, color });
  });
});
