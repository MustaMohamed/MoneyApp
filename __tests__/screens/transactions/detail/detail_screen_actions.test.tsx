import { fireEvent, render } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { ActionRow } from '@/modules/transactions/screens/transactions/detail/components/action_row';

describe('transaction detail actions', () => {
  it('shows only the owning commitment action for a linked transaction', () => {
    const onViewCommitment = jest.fn();
    const screen = render(<ActionRow onViewCommitment={onViewCommitment} />);

    expect(screen.queryByText(Strings.detailEditButton)).toBeNull();
    expect(screen.queryByText(Strings.detailDeleteButton)).toBeNull();
    fireEvent.press(screen.getByText(Strings.viewCommitment));
    expect(onViewCommitment).toHaveBeenCalledTimes(1);
  });

  it('shows edit and delete for an ordinary transaction', () => {
    const screen = render(<ActionRow onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText(Strings.detailEditButton)).toBeTruthy();
    expect(screen.getByText(Strings.detailDeleteButton)).toBeTruthy();
    expect(screen.queryByText(Strings.viewCommitment)).toBeNull();
  });
});
