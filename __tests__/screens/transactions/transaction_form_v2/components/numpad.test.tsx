import { render, fireEvent } from '@testing-library/react-native';

import { Numpad } from '@/screens/transactions/transaction_form_v2/components/numpad';

describe('Numpad', () => {
  it('renders digits 0-9 plus decimal and backspace', () => {
    const { getByTestId } = render(<Numpad onPress={() => {}} />);
    for (let i = 0; i <= 9; i++) {
      expect(getByTestId(`numpad-key-${i}`)).toBeTruthy();
    }
    expect(getByTestId('numpad-key-decimal')).toBeTruthy();
    expect(getByTestId('numpad-key-backspace')).toBeTruthy();
  });

  it('emits a "digit" action with the pressed value', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Numpad onPress={onPress} />);
    fireEvent.press(getByTestId('numpad-key-7'));
    expect(onPress).toHaveBeenCalledWith('digit', '7');
  });

  it('emits "decimal" action', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Numpad onPress={onPress} />);
    fireEvent.press(getByTestId('numpad-key-decimal'));
    expect(onPress).toHaveBeenCalledWith('decimal');
  });

  it('emits "backspace" action', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Numpad onPress={onPress} />);
    fireEvent.press(getByTestId('numpad-key-backspace'));
    expect(onPress).toHaveBeenCalledWith('backspace');
  });

  it('emits "digit" with "0"', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Numpad onPress={onPress} />);
    fireEvent.press(getByTestId('numpad-key-0'));
    expect(onPress).toHaveBeenCalledWith('digit', '0');
  });
});
