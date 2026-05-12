import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { SettingsSection } from '@/components/ui/settings_section';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

const baseItem = {
  label: 'Test Item',
  onPress: jest.fn(),
};

describe('SettingsSection', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('section header', () => {
    it('renders section title when provided', () => {
      const { getByText } = render(<SettingsSection title="MY SECTION" items={[baseItem]} />);
      expect(getByText('MY SECTION')).toBeTruthy();
    });

    it('does not render a header when title is omitted', () => {
      const { queryByTestId } = render(<SettingsSection items={[baseItem]} />);
      expect(queryByTestId('settings-section-header')).toBeNull();
    });
  });

  describe('rows', () => {
    it('renders item label', () => {
      const { getByText } = render(
        <SettingsSection items={[{ ...baseItem, label: 'Currency' }]} />,
      );
      expect(getByText('Currency')).toBeTruthy();
    });

    it('calls onPress when row is pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <SettingsSection items={[{ ...baseItem, label: 'Press Me', onPress }]} />,
      );
      fireEvent.press(getByText('Press Me'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders trailing chevron when trailing="chevron"', () => {
      const { getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, trailing: 'chevron' }]} />,
      );
      expect(getByTestId('trailing-chevron')).toBeTruthy();
    });

    it('renders trailing toggle when trailing="toggle"', () => {
      const { getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, trailing: 'toggle', toggleValue: true }]} />,
      );
      expect(getByTestId('trailing-toggle')).toBeTruthy();
    });

    it('renders trailing value text when value is provided', () => {
      const { getByText } = render(
        <SettingsSection items={[{ ...baseItem, value: 'USD', trailing: 'none' }]} />,
      );
      expect(getByText('USD')).toBeTruthy();
    });

    it('renders value text AND chevron simultaneously (§4 Currency row requirement)', () => {
      const { getByText, getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, value: 'EGP', trailing: 'chevron' }]} />,
      );
      expect(getByText('EGP')).toBeTruthy();
      expect(getByTestId('trailing-chevron')).toBeTruthy();
    });

    it('does not render leading icon container when icon is omitted', () => {
      const { queryByTestId } = render(<SettingsSection items={[{ ...baseItem }]} />);
      expect(queryByTestId('leading-icon')).toBeNull();
    });

    it('renders leading icon when icon is provided', () => {
      const { getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, icon: 'palette' }]} />,
      );
      expect(getByTestId('leading-icon')).toBeTruthy();
    });
  });

  describe('destructive rows', () => {
    it('renders label with danger style', () => {
      const { getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, label: 'Delete All', destructive: true }]} />,
      );
      expect(getByTestId('destructive-label')).toBeTruthy();
    });

    it('does not render leading icon for destructive rows', () => {
      const { queryByTestId } = render(
        <SettingsSection
          items={[{ ...baseItem, label: 'Delete', destructive: true, icon: 'trash-can' }]}
        />,
      );
      expect(queryByTestId('leading-icon')).toBeNull();
    });
  });

  describe('trailingContainer layout', () => {
    it('renders value text and chevron in the same row (IMPORTANT: flexDirection row)', () => {
      const { getByText, getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, value: 'EGP', trailing: 'chevron' }]} />,
      );
      // Both children are present, confirming they coexist in trailingContainer
      expect(getByText('EGP')).toBeTruthy();
      expect(getByTestId('trailing-chevron')).toBeTruthy();

      // Assert the trailingContainer itself has flexDirection: 'row'
      const container = getByTestId('trailing-container');
      expect(container.props.style).toMatchObject({ flexDirection: 'row' });
    });

    it('trailingContainer has flexDirection "row" when only chevron is rendered', () => {
      const { getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, trailing: 'chevron' }]} />,
      );
      const container = getByTestId('trailing-container');
      expect(container.props.style).toMatchObject({ flexDirection: 'row' });
    });

    it('trailingContainer has flexDirection "row" when toggle is rendered', () => {
      const { getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, trailing: 'toggle', toggleValue: false }]} />,
      );
      const container = getByTestId('trailing-container');
      expect(container.props.style).toMatchObject({ flexDirection: 'row' });
    });
  });

  describe('separators', () => {
    it('renders separators between rows but not after the last row', () => {
      const items = [
        { label: 'Row A', onPress: jest.fn() },
        { label: 'Row B', onPress: jest.fn() },
        { label: 'Row C', onPress: jest.fn() },
      ];
      const { getAllByTestId } = render(<SettingsSection items={items} />);
      expect(getAllByTestId('separator')).toHaveLength(2);
    });

    it('renders no separator for a single row', () => {
      const { queryByTestId } = render(<SettingsSection items={[baseItem]} />);
      expect(queryByTestId('separator')).toBeNull();
    });
  });
});
