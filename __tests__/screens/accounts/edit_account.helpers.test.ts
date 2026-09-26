import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { toUpdateAccountInput } from '@/modules/accounts/components/account_form/account_form.helpers';
import { DEFAULT_ACCOUNT_COLOR } from '@/modules/accounts/constants/account_palette';
import {
  buildEditAccountDraft,
  countFieldErrors,
  resolveEditStatusMessage,
} from '@/modules/accounts/screens/accounts/edit_account/edit_account.helpers';
import { createEditAccountFormSchema } from '@/modules/accounts/utils/edit_account.schema';
import { makeTestAccount } from '@/test_helpers/transaction';

const card = makeTestAccount({
  id: 'card-1',
  name: 'CIB Visa',
  type: AccountType.CreditCard,
  currency: Currency.EGP,
  color: '#1B2B4B',
  credit_limit: 1500.5,
  minimum_payment: 200,
  statement_due_day: 15,
  interest_tracking: 1,
  apr: 24.5,
  current_balance: 900,
});

describe('buildEditAccountDraft', () => {
  it('drafts the limit and the minimum at two decimals, APR and due day as stored', () => {
    expect(buildEditAccountDraft(card)).toEqual({
      name: 'CIB Visa',
      color: '#1B2B4B',
      interest_tracking: true,
      credit_limit: '1,500.50',
      min_payment: '200.00',
      due_day: '15',
      apr: '24.5',
    });
  });

  it('round-trips the draft through the edit schema to the five stored credit values unchanged', () => {
    const parsed = createEditAccountFormSchema([card], [], card).parse(buildEditAccountDraft(card));

    expect(toUpdateAccountInput(parsed, card)).toEqual({
      name: 'CIB Visa',
      color: '#1B2B4B',
      credit_limit: 1500.5,
      minimum_payment: 200,
      statement_due_day: 15,
      interest_tracking: 1,
      apr: 24.5,
    });
  });

  it('drafts a whole limit grouped at two decimals', () => {
    expect(buildEditAccountDraft({ ...card, credit_limit: 8450 }).credit_limit).toBe('8,450.00');
  });

  it('drafts a card with no minimum as an empty minimum', () => {
    expect(buildEditAccountDraft({ ...card, minimum_payment: null }).min_payment).toBe('');
  });

  it('round-trips a grouped 8,450.00 limit back to 8450', () => {
    const wholeLimit = { ...card, credit_limit: 8450 };
    const parsed = createEditAccountFormSchema([wholeLimit], [], wholeLimit).parse(
      buildEditAccountDraft(wholeLimit),
    );

    expect(toUpdateAccountInput(parsed, wholeLimit).credit_limit).toBe(8450);
  });

  it('drafts every empty credit column as empty text with tracking off', () => {
    const bank = makeTestAccount({ type: AccountType.Bank, color: '#1B2B4B' });

    expect(buildEditAccountDraft(bank)).toEqual({
      name: 'Cash',
      color: '#1B2B4B',
      interest_tracking: false,
      credit_limit: '',
      min_payment: '',
      due_day: '',
      apr: '',
    });
  });

  it('drafts a missing colour as the default swatch', () => {
    expect(buildEditAccountDraft(makeTestAccount({ color: null })).color).toBe(
      DEFAULT_ACCOUNT_COLOR,
    );
  });
});

describe('countFieldErrors', () => {
  it('counts one per faulted field', () => {
    expect(countFieldErrors({})).toBe(0);
    expect(
      countFieldErrors({
        name: { type: 'custom', message: Strings.errNameRequired },
        credit_limit: { type: 'custom', message: Strings.errCreditLimitRequired },
      }),
    ).toBe(2);
  });
});

describe('resolveEditStatusMessage', () => {
  it('is idle with no faults and no failed save', () => {
    expect(resolveEditStatusMessage({ errorCount: 0 })).toBeUndefined();
  });

  it('counts faults in the singular at 1 and the plural above', () => {
    expect(resolveEditStatusMessage({ errorCount: 1 })).toBe('Fix the 1 field marked above.');
    expect(resolveEditStatusMessage({ errorCount: 3 })).toBe('Fix the 3 fields marked above.');
  });

  it('shows the failure line after a failed save', () => {
    expect(
      resolveEditStatusMessage({ errorCount: 0, saveError: Strings.editAccountSaveError }),
    ).toBe(Strings.editAccountSaveError);
  });

  it('puts faults ahead of a failed save', () => {
    expect(
      resolveEditStatusMessage({ errorCount: 2, saveError: Strings.editAccountSaveError }),
    ).toBe('Fix the 2 fields marked above.');
  });
});
