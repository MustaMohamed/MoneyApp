import { act, renderHook } from '@testing-library/react-native';

import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  COMMITMENT_AMOUNT_REFUSES_ZERO,
  COMMITMENT_SCHEMA,
  type CommitmentFormValues,
} from '@/modules/commitments/screens/commitments/commitment_form.shared';
import { PLAN_TOTAL_REFUSES_ZERO, spendingPlanFormSchema } from '@/utils/schemas/budget.schema';
import { holdStillTypingDecimal, setTypedDecimal, useZodForm } from '@/utils/use_zod_form.hook';

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
        held = holdStillTypingDecimal(
          result.current.form,
          'totalText',
          text,
          PLAN_TOTAL_REFUSES_ZERO,
        );
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
      held = holdStillTypingDecimal(
        result.current.form,
        'totalText',
        text,
        PLAN_TOTAL_REFUSES_ZERO,
      );
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
      held = holdStillTypingDecimal(
        result.current.form,
        'amount',
        0,
        COMMITMENT_AMOUNT_REFUSES_ZERO,
        '0.',
      );
    });

    expect(held).toBe(true);
    expect(result.current.form.getValues('amount')).toBe(0);
    expect(result.current.errors.amount).toBeUndefined();
  });

  it('stores undefined for the typed text "." and raises no fault', async () => {
    const result = await mountRefusedCommitmentForm(5000);

    let held: boolean | undefined;
    await act(() => {
      held = holdStillTypingDecimal(
        result.current.form,
        'amount',
        undefined,
        COMMITMENT_AMOUNT_REFUSES_ZERO,
        '.',
      );
    });

    expect(held).toBe(true);
    expect(result.current.form.getValues('amount')).toBeUndefined();
    expect(result.current.errors.amount).toBeUndefined();
  });
});

describe('setTypedDecimal on a text field', () => {
  // Lets the validation a keystroke started resolve before the next read.
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('holds a still-typing text after a refused Save: stored, dirty, no fault', async () => {
    const result = await mountRefusedPlanForm();

    await act(async () => {
      setTypedDecimal(result.current.form, 'totalText', '48.', PLAN_TOTAL_REFUSES_ZERO, true);
      await settle();
    });

    expect(result.current.form.getValues('totalText')).toBe('48.');
    expect(result.current.dirtyFields.totalText).toBe(true);
    expect(result.current.errors.totalText).toBeUndefined();
  });

  it.each([
    ['0.001', Strings.budgetPlanAmountInvalid],
    ['', Strings.budgetPlanAmountRequired],
    ['48.5', undefined],
  ] as const)(
    'after a refused Save stores the complete text %p, marks it dirty and validates it to %p',
    async (text, message) => {
      const result = await mountRefusedPlanForm();

      await act(async () => {
        setTypedDecimal(result.current.form, 'totalText', text, PLAN_TOTAL_REFUSES_ZERO, true);
        await settle();
      });

      expect(result.current.form.getValues('totalText')).toBe(text);
      expect(result.current.dirtyFields.totalText).toBe(true);
      expect(result.current.errors.totalText?.message).toBe(message);
    },
  );

  it('before any Save stores a refused text and validates nothing', async () => {
    const { result } = await renderHook(() => {
      const form = useZodForm(spendingPlanFormSchema, {
        defaultValues: { nameText: 'Trip', totalText: '' },
      });
      const { errors } = form.formState;
      return { form, errors };
    });

    await act(async () => {
      setTypedDecimal(result.current.form, 'totalText', '0.001', PLAN_TOTAL_REFUSES_ZERO, false);
      await settle();
    });

    expect(result.current.form.getValues('totalText')).toBe('0.001');
    expect(result.current.errors.totalText).toBeUndefined();
  });

  it('a validated text then a held text, back to back, leave no fault once the validation settles', async () => {
    const result = await mountRefusedPlanForm();

    await act(async () => {
      setTypedDecimal(result.current.form, 'totalText', '', PLAN_TOTAL_REFUSES_ZERO, true);
      setTypedDecimal(result.current.form, 'totalText', '48.', PLAN_TOTAL_REFUSES_ZERO, true);
      await settle();
    });

    expect(result.current.form.getValues('totalText')).toBe('48.');
    expect(result.current.errors.totalText).toBeUndefined();
  });

  it('a held text then a refused complete text, back to back, show the complete text its fault', async () => {
    const result = await mountRefusedPlanForm();

    await act(async () => {
      setTypedDecimal(result.current.form, 'totalText', '48.', PLAN_TOTAL_REFUSES_ZERO, true);
      setTypedDecimal(result.current.form, 'totalText', '0.001', PLAN_TOTAL_REFUSES_ZERO, true);
      await settle();
    });

    expect(result.current.form.getValues('totalText')).toBe('0.001');
    expect(result.current.errors.totalText?.message).toBe(Strings.budgetPlanAmountInvalid);
  });
});
