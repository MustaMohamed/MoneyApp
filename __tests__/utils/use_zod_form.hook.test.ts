import { act, renderHook } from '@testing-library/react-native';

import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  COMMITMENT_SCHEMA,
  type CommitmentFormValues,
} from '@/modules/commitments/screens/commitments/commitment_form.shared';
import { spendingPlanFormSchema } from '@/utils/schemas/budget.schema';
import { holdStillTypingDecimal, useZodForm } from '@/utils/use_zod_form.hook';

const COMMITMENT_DEFAULTS: CommitmentFormValues = {
  amountType: AmountType.Fixed,
  name: '',
  amount: 5000,
  currency: Currency.EGP,
  categoryId: 'cat-1',
  recurrenceEvery: 1,
  recurrencePeriod: RecurrencePeriod.Months,
  startDate: '2026-01-01',
  durationType: DurationType.Forever,
};

// Mounts the plan form on a total Save refuses, and presses Save once.
async function mountRefusedPlanForm() {
  const view = await renderHook(() => {
    const form = useZodForm(spendingPlanFormSchema, {
      defaultValues: { nameText: 'Trip', totalText: 'abc' },
    });
    const { errors, dirtyFields } = form.formState;
    return { form, errors, dirtyFields };
  });
  await act(async () => {
    await view.result.current.form.handleSubmit(() => undefined)();
  });
  expect(view.result.current.errors.totalText?.message).toBe(Strings.errAmountInvalid);
  expect(view.result.current.dirtyFields.totalText).toBeUndefined();
  return view.result;
}

async function mountRefusedCommitmentForm(amount: number | undefined) {
  const view = await renderHook(() => {
    const form = useZodForm(COMMITMENT_SCHEMA, {
      defaultValues: { ...COMMITMENT_DEFAULTS, amount },
    });
    const { errors } = form.formState;
    return { form, errors };
  });
  await act(async () => {
    await view.result.current.form.handleSubmit(() => undefined)();
  });
  return view.result;
}

describe('holdStillTypingDecimal on a text field, after a refused Save', () => {
  it.each(['48.', '0', '0.', '0.0'])(
    'holds %p: stores it, marks the field dirty, leaves no fault',
    async (text) => {
      const result = await mountRefusedPlanForm();

      let held: boolean | undefined;
      await act(() => {
        held = holdStillTypingDecimal(result.current.form, 'totalText', text, true);
      });

      expect(held).toBe(true);
      expect(result.current.form.getValues('totalText')).toBe(text);
      expect(result.current.dirtyFields.totalText).toBe(true);
      expect(result.current.errors.totalText).toBeUndefined();
    },
  );

  it.each(['0.001', ''])('does not hold %p: value and fault stay as they were', async (text) => {
    const result = await mountRefusedPlanForm();

    let held: boolean | undefined;
    await act(() => {
      held = holdStillTypingDecimal(result.current.form, 'totalText', text, true);
    });

    expect(held).toBe(false);
    expect(result.current.form.getValues('totalText')).toBe('abc');
    expect(result.current.errors.totalText?.message).toBe(Strings.errAmountInvalid);
  });

  it('does not hold 0 on a field that admits zero', async () => {
    const result = await mountRefusedPlanForm();

    let held: boolean | undefined;
    await act(() => {
      held = holdStillTypingDecimal(result.current.form, 'totalText', '0', false);
    });

    expect(held).toBe(false);
    expect(result.current.form.getValues('totalText')).toBe('abc');
    expect(result.current.errors.totalText?.message).toBe(Strings.errAmountInvalid);
  });
});

describe('holdStillTypingDecimal on the commitment amount, a number field', () => {
  it('stores 0 for the typed text "0." and clears the fault Save raised', async () => {
    const result = await mountRefusedCommitmentForm(undefined);
    expect(result.current.errors.amount?.message).toBe(Strings.commitmentsErrAmountRequired);

    let held: boolean | undefined;
    await act(() => {
      held = holdStillTypingDecimal(result.current.form, 'amount', 0, true, '0.');
    });

    expect(held).toBe(true);
    expect(result.current.form.getValues('amount')).toBe(0);
    expect(result.current.errors.amount).toBeUndefined();
  });

  it('stores undefined for the typed text "." and raises no fault', async () => {
    const result = await mountRefusedCommitmentForm(5000);

    let held: boolean | undefined;
    await act(() => {
      held = holdStillTypingDecimal(result.current.form, 'amount', undefined, true, '.');
    });

    expect(held).toBe(true);
    expect(result.current.form.getValues('amount')).toBeUndefined();
    expect(result.current.errors.amount).toBeUndefined();
  });
});
