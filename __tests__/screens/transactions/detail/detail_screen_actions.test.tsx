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

  it('shows only the owning commitment action for a linked transaction', () => {
    const onViewCommitment = jest.fn();
    const screen = render(<ActionRow onViewCommitment={onViewCommitment} />);

    expect(screen.queryByText(Strings.detailEditButton)).toBeNull();
    expect(screen.queryByText(Strings.detailDeleteButton)).toBeNull();
    fireEvent.press(screen.getByText(Strings.viewCommitment));
    expect(onViewCommitment).toHaveBeenCalledTimes(1);
  });

  it('puts edit in the standard header for an ordinary transaction', () => {
    const onBack = jest.fn();
    const onEdit = jest.fn();
    const screen = render(<DetailHeader editable onBack={onBack} onEdit={onEdit} />);

    fireEvent.press(screen.getByLabelText(Strings.detailEditAccessibility));
    expect(onEdit).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText(Strings.goBackAccessibility));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('reserves the header action slot without exposing edit for owned transactions', () => {
    const screen = render(<DetailHeader editable={false} onBack={jest.fn()} onEdit={jest.fn()} />);

    expect(screen.queryByLabelText(Strings.detailEditAccessibility)).toBeNull();
  });

  it('shows only delete at the bottom for an ordinary transaction', () => {
    const screen = render(<ActionRow onDelete={jest.fn()} />);

    expect(screen.queryByText(Strings.detailEditButton)).toBeNull();
    expect(screen.getByText(Strings.detailDeleteButton)).toBeTruthy();
    expect(screen.queryByText(Strings.viewCommitment)).toBeNull();
  });
});
