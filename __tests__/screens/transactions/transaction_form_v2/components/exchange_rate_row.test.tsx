import { render, fireEvent } from '@testing-library/react-native';

import { ExchangeRateRow } from '@/screens/transactions/transaction_form_v2/components/exchange_rate_row';

describe('ExchangeRateRow', () => {
  it('shows the stored rate value when overrideEnabled=false', () => {
    const { getByText } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={() => {}}
        rateUpdatedAt="2026-05-12T10:00:00.000Z"
        amount={100}
      />,
    );
    expect(getByText('50.75')).toBeTruthy();
  });

  it('shows the override Input when overrideEnabled=true', () => {
    const { getByTestId } = render(
      <ExchangeRateRow
        value="55.0"
        onChange={() => {}}
        overrideEnabled={true}
        onToggleOverride={() => {}}
        rateUpdatedAt={null}
        amount={100}
      />,
    );
    const input = getByTestId('exchange-rate-input');
    expect(input.props.value).toBe('55.0');
  });

  it('calls onChange when the override Input changes', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ExchangeRateRow
        value="55.0"
        onChange={onChange}
        overrideEnabled={true}
        onToggleOverride={() => {}}
        rateUpdatedAt={null}
        amount={100}
      />,
    );
    fireEvent.changeText(getByTestId('exchange-rate-input'), '52.5');
    expect(onChange).toHaveBeenCalledWith('52.5');
  });

  it('shows the "Using stored rate" subtitle when overrideEnabled=false', () => {
    const { getByText } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={() => {}}
        rateUpdatedAt="2026-05-12T10:00:00.000Z"
        amount={100}
      />,
    );
    expect(getByText(/Using stored rate/)).toBeTruthy();
  });

  it('shows the "Custom rate" subtitle when overrideEnabled=true', () => {
    const { getByText } = render(
      <ExchangeRateRow
        value="55.0"
        onChange={() => {}}
        overrideEnabled={true}
        onToggleOverride={() => {}}
        rateUpdatedAt={null}
        amount={100}
      />,
    );
    expect(getByText(/Custom rate/)).toBeTruthy();
  });

  it('shows the live EGP preview using roundMoney(amount × rate)', () => {
    const { getByText } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={() => {}}
        rateUpdatedAt={null}
        amount={50}
      />,
    );
    // 50 × 50.75 = 2537.5 → "≈ 2,537.50 EGP"
    expect(getByText(/2,537\.50 EGP/)).toBeTruthy();
  });

  it('flags stale rate (>30 days) with a warning treatment', () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const { getByText } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={() => {}}
        rateUpdatedAt={old}
        amount={100}
      />,
    );
    expect(getByText(/Rate may be stale/)).toBeTruthy();
  });

  it('does NOT flag stale when rateUpdatedAt is recent', () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const { queryByText } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={() => {}}
        rateUpdatedAt={recent}
        amount={100}
      />,
    );
    expect(queryByText(/Rate may be stale/)).toBeNull();
  });

  it('calls onToggleOverride when the row is pressed (when not in override)', () => {
    const onToggleOverride = jest.fn();
    const { getByTestId } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={onToggleOverride}
        rateUpdatedAt={null}
        amount={100}
      />,
    );
    fireEvent.press(getByTestId('exchange-rate-row'));
    expect(onToggleOverride).toHaveBeenCalled();
  });
});
