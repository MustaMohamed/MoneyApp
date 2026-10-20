import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions } from 'react-native';

import { resolveFactRowFlex } from '@/components/ui/fact_row.geometry';
import { resolveSheetSizeAboveOne } from '@/components/ui/sheet.helpers';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';
import { FIELD_MESSAGE_RAIL_STYLE } from '@/modules/accounts/components/account_form/account_form.geometry';
import { AdjustBalanceSheet } from '@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet';
import { useAdjustBalanceSheetState } from '@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state';
import { formatAccountBalance } from '@/utils/format_amount';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return ({ name }: { name: string }) => <View testID={`icon-${name}`} />;
});

const mockSheetSize = jest.fn();
jest.mock('@/components/ui/sheet', () => ({
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
  Sheet: ({
    isOpen,
    size,
    children,
    footer,
  }: {
    isOpen: boolean;
    size?: string;
    children?: ReactNode;
    footer?: ReactNode;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    mockSheetSize(size);
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
      accountType={AccountType.Bank}
      onOpenChange={jest.fn()}
      onSave={onSave}
      isLoading={isLoading}
    />,
  );
}

type HostNode = ReturnType<typeof screen.getByTestId>;

const ALERT_GLYPH = 'icon-alert-circle-outline';
const ERROR_ID = 'balance-error';

function liveRegionAbove(node: HostNode): HostNode {
  let current: HostNode | null = node;
  while (current) {
    const liveRegion: unknown = current.props.accessibilityLiveRegion;
    if (liveRegion !== undefined) return current;
    current = current.parent;
  }
  throw new Error('no view above the message holds a live region');
}

function messageOrder(track: HostNode): string[] {
  return within(track)
    .getAllByTestId(new RegExp(`^(${ALERT_GLYPH}|${ERROR_ID})$`))
    .map((node) => {
      const id: unknown = node.props.testID;
      return typeof id === 'string' ? id : '';
    });
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
    // The parse error asks the user to change the value; this one asks them to retry it.
    expect(getByTestId('balance-error')).not.toHaveTextContent(Strings.errBalanceInvalid);
    expect(messageOrder(liveRegionAbove(getByTestId(ERROR_ID)))).toEqual([ALERT_GLYPH, ERROR_ID]);
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
    const { getByTestId, getByText, queryByTestId, queryByText } = await renderSheet(onSave);

    expect(getByText(Strings.adjustBalanceHelper)).toBeTruthy();
    expect(queryByTestId(ALERT_GLYPH)).toBeNull();

    await fireEvent.changeText(getByTestId('balance-input'), '27,500abc');
    await fireEvent.press(getByText(Strings.adjustBalanceSave));

    expect(onSave).not.toHaveBeenCalled();
    expect(getByTestId('balance-error')).toHaveTextContent(Strings.errBalanceInvalid);
    expect(queryByText(Strings.adjustBalanceHelper)).toBeNull();
    const track = liveRegionAbove(getByTestId(ERROR_ID));
    expect(messageOrder(track)).toEqual([ALERT_GLYPH, ERROR_ID]);
    expect(track).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(track).toHaveProp('collapsable', false);
    expect(track).toHaveStyle(FIELD_MESSAGE_RAIL_STYLE);
  });

  it('replaces the parse error with the save error rather than stacking them', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('db write failed'));
    const { getByTestId, getByText } = await renderSheet(onSave);

    await fireEvent.changeText(getByTestId('balance-input'), 'abc');
    await fireEvent.press(getByText(Strings.adjustBalanceSave));
    expect(getByTestId('balance-error')).toHaveTextContent(Strings.errBalanceInvalid);

    await fireEvent.changeText(getByTestId('balance-input'), '31000');
    await fireEvent.press(getByText(Strings.adjustBalanceSave));

    await waitFor(() =>
      expect(getByTestId('balance-error')).toHaveTextContent(Strings.adjustBalanceSaveError),
    );
    expect(onSave).toHaveBeenCalledWith(31000);
  });
});

describe('AdjustBalanceSheet size', () => {
  it('MA-163: opens at the size the font scale resolves from sm, a step up above scale 1', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    await renderSheet(jest.fn());

    expect(mockSheetSize).toHaveBeenLastCalledWith(resolveSheetSizeAboveOne('sm', fontScale));
  });
});

describe('AdjustBalanceSheet current balance row', () => {
  it('MA-201: above scale 1 the label gives way to a whole ellipsis before the amount fits', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    const { getByText } = await renderSheet(jest.fn());

    const amount = getByText(formatAccountBalance(CURRENT_BALANCE, Currency.EGP));
    expect(amount).toHaveProp('numberOfLines', 1);
    expect(amount).toHaveProp('allowFontScaling', false);
    expect(amount).toHaveProp('adjustsFontSizeToFit', true);
    expect(amount).toHaveStyle(scaledTextStyle(Type.bodyStrong, fontScale));
    expect(amount).toHaveStyle(resolveFactRowFlex(true).group);

    const label = getByText(Strings.accountDetailBalance);
    expect(label).toHaveProp('numberOfLines', 1);
    expect(label).toHaveProp('allowFontScaling', false);
    expect(label).toHaveStyle(scaledTextStyle(Type.meta, fontScale));
    expect(label).toHaveStyle(resolveFactRowFlex(true).label);
  });
});
