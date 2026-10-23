import type { UseFormReturn } from 'react-hook-form';

import { AmountHero } from '@/components/ui/amount_hero';
import type { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import type { CommitmentFormValues } from '../commitment_form.shared';
import { useCommitmentAmountHero } from './commitment_amount_hero.hook';

interface Props {
  form: UseFormReturn<CommitmentFormValues>;
  currency: Currency;
  invalid: boolean;
}

export function CommitmentAmountHero({ form, currency, invalid }: Props): React.ReactElement {
  const { text, onChange } = useCommitmentAmountHero(form);
  return (
    <AmountHero
      value={text}
      onChange={onChange}
      tone="foreground"
      currency={currency}
      invalid={invalid}
      accessibilityLabel={Strings.commitmentsAmountInputAccessibility}
    />
  );
}
