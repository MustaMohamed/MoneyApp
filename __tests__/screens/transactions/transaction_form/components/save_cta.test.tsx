import { render, fireEvent } from '@testing-library/react-native';

import { SaveCta } from '@/screens/transactions/transaction_form/components/save_cta';

describe('SaveCta', () => {
  it('renders the provided label', () => {
    const { getByText } = render(
      <SaveCta saving={false} onPress={() => {}} label="Save Transaction" />,
    );
    expect(getByText('Save Transaction')).toBeTruthy();
  });

  it('calls onPress when pressed (saving=false)', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SaveCta saving={false} onPress={onPress} label="Save Transaction" />,
    );
    fireEvent.press(getByTestId('save-cta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows ActivityIndicator when saving=true', () => {
    const { getByTestId, queryByText } = render(
      <SaveCta saving={true} onPress={() => {}} label="Save Transaction" />,
    );
    expect(getByTestId('save-cta-spinner')).toBeTruthy();
    expect(queryByText('Save Transaction')).toBeNull();
  });

  it('does not call onPress while saving=true', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SaveCta saving={true} onPress={onPress} label="Save Transaction" />,
    );
    fireEvent.press(getByTestId('save-cta'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
