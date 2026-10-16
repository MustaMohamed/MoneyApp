import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return (props: object) => ReactLocal.createElement(View, props);
});

import { resolveStackHeaderGeometry } from '@/components/ui/stack_header.geometry';
import { Strings } from '@/constants/strings';
import { Radius } from '@/constants/theme';
import { ActionRow } from '@/modules/transactions/screens/transactions/detail/components/action_row';
import { DetailHeader } from '@/modules/transactions/screens/transactions/detail/components/detail_header';

describe('transaction detail actions', () => {
  it("frame C6: shows View commitment alone, flat, for a commitment's payment, and no notice on an archived account", async () => {
    const onViewCommitment = jest.fn();
    const notice = Strings.transactionAccountArchived('Old HSBC');
    const screen = await render(
      <ActionRow
        actionSet="viewCommitment"
        notice={notice}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onViewCommitment={onViewCommitment}
      />,
    );

    expect(screen.queryByText(Strings.detailEditButton)).toBeNull();
    expect(screen.queryByText(Strings.detailDeleteButton)).toBeNull();
    expect(screen.queryByText(notice)).toBeNull();
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
