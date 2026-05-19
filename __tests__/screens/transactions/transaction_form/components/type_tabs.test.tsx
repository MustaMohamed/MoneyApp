import { render, fireEvent } from '@testing-library/react-native';

import { TransactionType } from '@/constants/enums';
import { TypeTabs } from '@/screens/transactions/transaction_form/components/type_tabs';

describe('TypeTabs', () => {
  it('renders all four type labels', () => {
    const { getByText } = render(
      <TypeTabs active={TransactionType.Expense} onSelect={() => {}} disabled={false} />,
    );
    expect(getByText('Expense')).toBeTruthy();
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('Transfer')).toBeTruthy();
    expect(getByText('CC Payment')).toBeTruthy();
  });

  it('marks the active tab via testID + accessibility state', () => {
    const { getByTestId } = render(
      <TypeTabs active={TransactionType.Transfer} onSelect={() => {}} disabled={false} />,
    );
    const transferTab = getByTestId('type-tab-transfer');
    expect(transferTab.props.accessibilityState?.selected).toBe(true);
    const expenseTab = getByTestId('type-tab-expense');
    expect(expenseTab.props.accessibilityState?.selected).toBe(false);
  });

  it('calls onSelect with the chosen type when a tab is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <TypeTabs active={TransactionType.Expense} onSelect={onSelect} disabled={false} />,
    );
    fireEvent.press(getByTestId('type-tab-income'));
    expect(onSelect).toHaveBeenCalledWith(TransactionType.Income);
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <TypeTabs active={TransactionType.Expense} onSelect={onSelect} disabled={true} />,
    );
    fireEvent.press(getByTestId('type-tab-income'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('exposes per-type color class on the active tab indicator', () => {
    // Each type maps to a token: expense=text-danger, income=text-success,
    // transfer=text-info, cc_payment=text-accent-cc.
    const cases: Array<[TransactionType, string]> = [
      [TransactionType.Expense, 'text-danger'],
      [TransactionType.Income, 'text-success'],
      [TransactionType.Transfer, 'text-info'],
      [TransactionType.CCPayment, 'text-accent-cc'],
    ];
    for (const [type, klass] of cases) {
      const { getByTestId, unmount } = render(
        <TypeTabs active={type} onSelect={() => {}} disabled={false} />,
      );
      const indicator = getByTestId(`type-tab-indicator-${type}`);
      const className = indicator.props.className ?? '';
      expect(className).toContain(klass);
      unmount();
    }
  });
});
