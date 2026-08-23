/**
 * adjust_balance_sheet_save_error.test.tsx
 *
 * `AdjustBalanceSheet.handleSave`, and only that. P8 cycle 3 H2/H5: the screen
 * hook's `handleAdjustBalance` had no catch and its one caller discarded the
 * promise, so a repository failure became an unhandled rejection — the sheet
 * stayed open, the Save Balance button went idle, and nothing was said. The
 * catch belongs here rather than in the hook: this component owns the `error`
 * channel it renders through (.claude/rules/state.md), and the hook has exactly
 * one caller, this sheet's `onSave`.
 *
 * That placement is what makes the `await` on `onSave` load-bearing. Drop it and
 * the rejection leaves the try before it settles, the catch never runs, and the
 * failure is silent again — so the first case here reds on that mutation alone.
 *
 * `handleSave` lives in the render body of a `.tsx`, so no logic-only `.ts`
 * suite can reach it; same justification P9 accepted for
 * pay_sheet_converted_total.test.tsx. Mocking follows pay_sheet_rate_error:
 * `Input` and `FormErrorText` are stubbed to the props under test rather than to
 * `null`, because asserting a prop the stub throws away asserts nothing. The
 * error store is the real one — it is the channel being verified.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AdjustBalanceSheet } from '@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet';
import { useAdjustBalanceSheetState } from '@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state';

jest.mock('@/components/ui/sheet', () => ({
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
  Sheet: ({
    isOpen,
    children,
    footer,
  }: {
    isOpen: boolean;
    children?: ReactNode;
    footer?: ReactNode;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return isOpen ? (
      <View testID="adjust-sheet">
        {children}
        {footer}
      </View>
    ) : null;
  },
}));
jest.mock('@/components/ui/button', () => ({
  Button: ({
    label,
    onPress,
    isDisabled,
  }: {
    label: string;
    onPress?: () => void;
    isDisabled?: boolean;
  }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text onPress={isDisabled ? undefined : onPress}>{label}</Text>;
  },
}));
// Reduced to the props these assertions read. The real Input drags in HeroUI's
// TextField shell, none of which this suite is about.
jest.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChangeText,
    isInvalid,
  }: {
    value: string;
    onChangeText: (v: string) => void;
    isInvalid?: boolean;
  }) => {
    const { TextInput } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <TextInput
        testID="balance-input"
        accessibilityState={{ disabled: !!isInvalid }}
        value={value}
        onChangeText={onChangeText}
      />
    );
  },
}));
jest.mock('@/components/ui/form_error_text', () => ({
  FormErrorText: ({ message }: { message?: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return message ? <Text testID="balance-error">{message}</Text> : null;
  },
}));

const CURRENT_BALANCE = 27500;

function renderSheet(onSave: (v: number) => void | Promise<void>, isLoading = false) {
  return render(
    <AdjustBalanceSheet
      isOpen
      currentBalance={CURRENT_BALANCE}
      currency={Currency.EGP}
      onOpenChange={jest.fn()}
      onSave={onSave}
      isLoading={isLoading}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useAdjustBalanceSheetState.getState().reset();
});

describe('AdjustBalanceSheet save failure', () => {
  it('H5: surfaces a rejected save on the sheet instead of dropping it', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('db write failed'));
    const { getByTestId, getByText } = await renderSheet(onSave);

    await fireEvent.press(getByText(Strings.adjustBalanceSave));

    expect(onSave).toHaveBeenCalledWith(CURRENT_BALANCE);
    await waitFor(() =>
      expect(getByTestId('balance-error')).toHaveTextContent(Strings.adjustBalanceSaveError),
    );
    // Not the parse error: that one asks the user to change what they typed,
    // this one to retry the same value. Sharing a message would mis-instruct.
    expect(getByTestId('balance-error')).not.toHaveTextContent(Strings.errBalanceInvalid);
  });

  it('says nothing when the save succeeds', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { getByText, queryByTestId } = await renderSheet(onSave);

    await fireEvent.press(getByText(Strings.adjustBalanceSave));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(CURRENT_BALANCE));
    expect(queryByTestId('balance-error')).toBeNull();
  });

  it('shows the parse error and never reaches the store on unreadable input', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, getByText } = await renderSheet(onSave);

    await fireEvent.changeText(getByTestId('balance-input'), '27,500abc');
    await fireEvent.press(getByText(Strings.adjustBalanceSave));

    expect(onSave).not.toHaveBeenCalled();
    expect(getByTestId('balance-error')).toHaveTextContent(Strings.errBalanceInvalid);
  });

  it('replaces the parse error with the save error rather than stacking them', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('db write failed'));
    const { getByTestId, getByText } = await renderSheet(onSave);

    await fireEvent.changeText(getByTestId('balance-input'), 'abc');
    await fireEvent.press(getByText(Strings.adjustBalanceSave));
    expect(getByTestId('balance-error')).toHaveTextContent(Strings.errBalanceInvalid);

    // The user fixes the input; the write is what fails this time.
    await fireEvent.changeText(getByTestId('balance-input'), '31000');
    await fireEvent.press(getByText(Strings.adjustBalanceSave));

    await waitFor(() =>
      expect(getByTestId('balance-error')).toHaveTextContent(Strings.adjustBalanceSaveError),
    );
    expect(onSave).toHaveBeenCalledWith(31000);
  });
});
