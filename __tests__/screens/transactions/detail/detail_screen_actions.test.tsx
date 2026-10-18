import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return (props: object) => ReactLocal.createElement(View, props);
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
// The floating arm's toast hold calls `useFocusEffect`, which needs a navigator.
jest.mock('@/components/ui/load_error_alert.hook', () => ({
  useFloatingAlertToastHold: () => ({ frameRef: { current: null }, holdClearance: jest.fn() }),
}));
// `jest.config.js` leaves uniwind's TypeScript source untransformed.
jest.mock('uniwind', () => ({ withUniwind: <T,>(component: T): T => component }));

import {
  HEADER_ACTION_HIT_SLOP,
  resolveStackHeaderGeometry,
} from '@/components/ui/stack_header.geometry';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Radius, Size } from '@/constants/theme';
import { resolveRowTile } from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { ActionRow } from '@/modules/transactions/screens/transactions/detail/components/action_row';
import { resolveTransferCellHeight } from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';
import { DetailHeader } from '@/modules/transactions/screens/transactions/detail/components/detail_header';
import { DetailLoadError } from '@/modules/transactions/screens/transactions/detail/components/detail_load_error';
import { TransferFlowCard } from '@/modules/transactions/screens/transactions/detail/components/transfer_flow_card';
import {
  type TransferFlow,
  transferCellAmountText,
} from '@/modules/transactions/screens/transactions/detail/detail.helpers';
import { makeTestAccount } from '@/test_helpers/transaction';

describe('transaction detail actions', () => {
  it("frame C6: shows View commitment alone, flat, for a commitment's payment", async () => {
    const onViewCommitment = jest.fn();
    const screen = await render(
      <ActionRow
        actionSet="viewCommitment"
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onViewCommitment={onViewCommitment}
      />,
    );

    expect(screen.queryByText(Strings.detailEditButton)).toBeNull();
    expect(screen.queryByText(Strings.detailDeleteButton)).toBeNull();
    expect(screen.getByText(Strings.viewCommitment).parent).toHaveStyle({
      borderRadius: Radius.cta,
    });
    await fireEvent.press(screen.getByText(Strings.viewCommitment));
    expect(onViewCommitment).toHaveBeenCalledTimes(1);
  });

  it('puts edit in the standard header for an ordinary transaction', async () => {
    const onBack = jest.fn();
    const onEdit = jest.fn();
    const screen = await render(
      <DetailHeader editable refreshing={false} onBack={onBack} onEdit={onEdit} />,
    );

    await fireEvent.press(screen.getByLabelText(Strings.detailEditAccessibility));
    expect(onEdit).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByLabelText(Strings.goBackAccessibility));
    expect(onBack).toHaveBeenCalledTimes(1);

    const title = screen.getByText(Strings.detailHeader);
    expect(title).toHaveProp('allowFontScaling', false);
    expect(title).toHaveStyle(resolveStackHeaderGeometry(Dimensions.get('window').fontScale).title);
  });

  it('reserves the header action slot without exposing edit for owned transactions', async () => {
    const screen = await render(
      <DetailHeader editable={false} refreshing={false} onBack={jest.fn()} onEdit={jest.fn()} />,
    );

    expect(screen.queryByLabelText(Strings.detailEditAccessibility)).toBeNull();
  });

  it('uses the reserved header action slot for refresh progress', async () => {
    const screen = await render(
      <DetailHeader editable refreshing onBack={jest.fn()} onEdit={jest.fn()} />,
    );

    expect(screen.getByLabelText(Strings.detailRefreshingAccessibility)).toBeTruthy();
    expect(screen.queryByLabelText(Strings.detailEditAccessibility)).toBeNull();
  });

  it('MA-194: edit and back draw the shared header box with its tap band, and the refresh spinner holds that box size', async () => {
    const screen = await render(
      <DetailHeader editable refreshing={false} onBack={jest.fn()} onEdit={jest.fn()} />,
    );

    for (const label of [Strings.detailEditAccessibility, Strings.goBackAccessibility]) {
      const action = screen.getByLabelText(label);
      expect(action).toHaveProp('hitSlop', HEADER_ACTION_HIT_SLOP);
      expect(action).toHaveStyle({
        width: Size.headerActionTrack,
        height: Size.headerActionTrack,
        borderRadius: Radius.sm,
        borderWidth: Size.hairline,
      });
    }

    await screen.rerender(
      <DetailHeader editable refreshing onBack={jest.fn()} onEdit={jest.fn()} />,
    );

    expect(screen.getByLabelText(Strings.detailRefreshingAccessibility)).toHaveStyle({
      width: Size.headerActionTrack,
      height: Size.headerActionTrack,
    });
  });

  it('frame C1: shows flat Edit and Delete for an ordinary transaction, each pressing its own handler', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onViewCommitment = jest.fn();
    const screen = await render(
      <ActionRow
        actionSet="editDelete"
        onEdit={onEdit}
        onDelete={onDelete}
        onViewCommitment={onViewCommitment}
      />,
    );

    for (const label of [Strings.detailEditButton, Strings.detailDeleteButton]) {
      expect(screen.getByText(label)).toHaveProp('allowFontScaling', false);
      expect(screen.getByText(label)).toHaveProp('numberOfLines', 1);
      expect(screen.getByText(label).parent).toHaveStyle({ borderRadius: Radius.cta });
    }
    expect(screen.queryByText(Strings.viewCommitment)).toBeNull();

    await fireEvent.press(screen.getByText(Strings.detailEditButton));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(Strings.detailDeleteButton));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onViewCommitment).not.toHaveBeenCalled();
  });

  it('frame C7: shows the archived notice in place of every action', async () => {
    const notice = Strings.transactionAccountArchived('Old HSBC');
    const screen = await render(
      <ActionRow
        actionSet="archivedNotice"
        notice={notice}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onViewCommitment={jest.fn()}
      />,
    );

    expect(screen.getByText(notice)).toBeTruthy();
    expect(screen.queryByText(Strings.detailEditButton)).toBeNull();
    expect(screen.queryByText(Strings.detailDeleteButton)).toBeNull();
    expect(screen.queryByText(Strings.viewCommitment)).toBeNull();
  });
});

describe('transaction detail load errors (MA-182)', () => {
  it('frame C9: the first load draws the flat error block, and Try again retries once', async () => {
    const onRetry = jest.fn();
    const screen = await render(<DetailLoadError onRetry={onRetry} />);

    expect(screen.getByText(Strings.detailLoadErrorTitle)).toBeTruthy();
    expect(screen.getByText(Strings.detailLoadErrorDescription)).toBeTruthy();
    expect(screen.getByText(Strings.detailLoadRetry).parent).toHaveStyle({
      borderRadius: Radius.cta,
    });
    await fireEvent.press(screen.getByText(Strings.detailLoadRetry));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('frame C12: a refresh failure floats the alert with a flat Try again, which retries once', async () => {
    const onRetry = jest.fn();
    const screen = await render(<DetailLoadError floating onRetry={onRetry} />);

    expect(screen.getByText(Strings.detailRefreshErrorTitle)).toBeTruthy();
    expect(screen.getByText(Strings.detailLoadRetry).parent).toHaveStyle({
      borderRadius: Radius.cta,
    });
    await fireEvent.press(screen.getByText(Strings.detailLoadRetry));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(Strings.detailLoadErrorDescription)).toBeNull();
  });
});

describe('transaction detail transfer flow card (MA-196)', () => {
  it('a deleted To cell takes no tap, the resolved From cell opens its account, and both cells stand at the scaled cell height', async () => {
    const fromAccount = makeTestAccount({
      id: 'account-hsbc',
      name: 'HSBC',
      type: AccountType.Bank,
    });
    const toAccount = makeTestAccount({
      id: 'account-vault',
      name: 'Dollar Vault',
      type: AccountType.Bank,
      currency: Currency.USD,
      is_deleted: 1,
    });
    const fromAmount = transferCellAmountText(5000, Currency.EGP, '−');
    const fromLabel = Strings.detailOpenAccountAccessibility(
      fromAccount.name,
      fromAmount.accessible,
    );
    const flow: TransferFlow = {
      from: {
        name: fromAccount.name,
        tile: resolveRowTile(fromAccount),
        amountText: fromAmount,
        open: { accountId: fromAccount.id, accessibilityLabel: fromLabel },
      },
      to: {
        name: Strings.deletedAccount,
        tile: resolveRowTile(toAccount),
        amountText: transferCellAmountText(102.04, Currency.USD, '+'),
      },
    };
    const onOpenAccount = jest.fn();
    const screen = await render(<TransferFlowCard flow={flow} onOpenAccount={onOpenAccount} />);

    expect(
      screen.container.queryAll(
        (node) => typeof node.type === 'string' && node.props.accessibilityRole === 'button',
      ),
    ).toHaveLength(1);
    expect(screen.getByText(Strings.deletedAccount)).toBeTruthy();

    await fireEvent.press(screen.getByText(Strings.deletedAccount));
    expect(onOpenAccount).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText(fromLabel));
    expect(onOpenAccount).toHaveBeenCalledTimes(1);
    expect(onOpenAccount).toHaveBeenCalledWith(fromAccount.id);

    const cells = screen.getAllByTestId('transaction-detail-transfer-cell');
    expect(cells).toHaveLength(2);
    const height = resolveTransferCellHeight(Dimensions.get('window').fontScale);
    for (const cell of cells) {
      expect(cell).toHaveStyle({ height });
    }
  });
});
