import type { AmountHeroTone } from '@/components/ui/amount_hero';
import { TransactionType } from '@/constants/enums';

/** The amount hero's tone per transaction type; the pay sheet reads the expense tone. */
export const AMOUNT_HERO_TONE: Record<TransactionType, AmountHeroTone> = {
  [TransactionType.Expense]: 'danger',
  [TransactionType.Income]: 'success',
  [TransactionType.Transfer]: 'info',
  [TransactionType.CCPayment]: 'accentCc',
};
