import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return (props: object) => ReactLocal.createElement(View, props);
});

import { Strings } from '@/constants/strings';
import { ActionRow } from '@/modules/transactions/screens/transactions/detail/components/action_row';
import { DetailHeader } from '@/modules/transactions/screens/transactions/detail/components/detail_header';

describe('transaction detail actions', () => {
  it('keeps navigation and form orchestration out of the screen template', () => {
    const template = readFileSync(
      resolve(process.cwd(), 'src/modules/transactions/screens/transactions/detail/index.tsx'),
      'utf8',
    );

    expect(template).not.toContain('router.');
    expect(template).not.toContain('useTransactionFormState');
  });

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
    expect(screen.getByText(Strings.detailDeleteButton)).toBeTruthy();
    expect(screen.queryByText(Strings.viewCommitment)).toBeNull();
  });
});
