import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('heroui-native', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

// Uses the __mocks__/@gorhom/bottom-sheet.tsx mock automatically via moduleNameMapper
// The mock renders children when index >= 0 and null when index < 0.

import { Sheet } from '@/components/ui/sheet';

describe('Sheet component', () => {
  it('renders children when visible is true', () => {
    const { getByText } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    // Sheet is open — the bottom-sheet mock renders children
    // We test via the bottom-sheet testID
    const { getByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(getByTestId('bottom-sheet')).toBeTruthy();
  });

  it('does not render children when visible is false', () => {
    const { queryByTestId } = render(
      <Sheet visible={false} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    // Mock returns null when index < 0
    expect(queryByTestId('bottom-sheet')).toBeNull();
  });

  it('renders title in header when title prop is provided', () => {
    const { getByText } = render(
      <Sheet visible={true} onClose={jest.fn()} title="My Sheet" size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(getByText('My Sheet')).toBeTruthy();
  });

  it('does not render header when title is omitted', () => {
    const { queryByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(queryByTestId('sheet-header')).toBeNull();
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <Sheet visible={true} onClose={onClose} title="Close Me" size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    fireEvent.press(getByTestId('sheet-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when footer prop is provided', () => {
    const { getByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm" footer={<></>}>
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(getByTestId('sheet-footer')).toBeTruthy();
  });

  it('does not render footer container when footer is omitted', () => {
    const { queryByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(queryByTestId('sheet-footer')).toBeNull();
  });
});
