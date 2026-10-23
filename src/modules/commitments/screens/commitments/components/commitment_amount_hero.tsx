import { useEffect } from 'react';
import { useController, type UseFormReturn } from 'react-hook-form';

import { AmountHero } from '@/components/ui/amount_hero';
import type { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { formatStoredMoneyText } from '@/utils/money_text';

import { applyCommitmentAmountText, resolveAmountHeroSyncText } from '../commitment_form.helpers';
import type { CommitmentFormValues } from '../commitment_form.shared';
import { useDecimalInputState } from './commitment_amount_hero.store';

interface Props {
  form: UseFormReturn<CommitmentFormValues>;
  currency: Currency;
  invalid: boolean;
}

/** Reads the amount through its own controller, so a keystroke re-renders the hero and not the body. */
export function CommitmentAmountHero({ form, currency, invalid }: Props): React.ReactElement {
  const { field } = useController({ control: form.control, name: 'amount' });
  const { state, setText, syncToValue } = useDecimalInputState(formatStoredMoneyText(field.value));

  useEffect(() => {
    const next = resolveAmountHeroSyncText(state.text, field.value);
    if (next !== undefined) syncToValue(next);
  }, [field.value]); // oxlint-disable-line react-hooks/exhaustive-deps -- omit syncToValue/state.text to prevent sync loop

  return (
    <AmountHero
      value={state.text}
      onChange={(masked) => {
        setText(masked);
        applyCommitmentAmountText(form, masked, field.onChange);
      }}
      tone="foreground"
      currency={currency}
      invalid={invalid}
      accessibilityLabel={Strings.commitmentsAmountInputAccessibility}
    />
  );
}
