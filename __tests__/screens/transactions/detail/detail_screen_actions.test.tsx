import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return (props: object) => ReactLocal.createElement(View, props);
});

import { resolveStackHeaderGeometry } from '@/components/ui/stack_header.geometry';
import { Strings } from '@/constants/strings';
import { ActionRow } from '@/modules/transactions/screens/transactions/detail/components/action_row';
import { DetailHeader } from '@/modules/transactions/screens/transactions/detail/components/detail_header';

describe('transaction detail actions', () => {
  it('shows only the owning commitment action for a linked transaction', async () => {
    const onViewCommitment = jest.fn();
    const screen = await render(<ActionRow onViewCommitment={onViewCommitment} />);

    expect(screen.queryByText(Strings.detailEditButton)).toBeNull();
    expect(screen.queryByText(Strings.detailDeleteButton)).toBeNull();
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

  it('shows only delete at the bottom for an ordinary transaction', async () => {
    const screen = await render(<ActionRow onDelete={jest.fn()} />);

    expect(screen.queryByText(Strings.detailEditButton)).toBeNull();
    expect(screen.getByText(Strings.detailDeleteButton)).toHaveProp('allowFontScaling', false);
    expect(screen.getByText(Strings.detailDeleteButton)).toHaveProp('numberOfLines', 1);
    expect(screen.queryByText(Strings.viewCommitment)).toBeNull();
  });
});
