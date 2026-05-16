import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { SegmentSwitcher } from '@/screens/dashboard_v2/components/segment_switcher';

describe('SegmentSwitcher', () => {
  it('renders both labels', () => {
    const { getByText } = render(
      <SegmentSwitcher value="overview" onChange={() => {}} />,
    );
    expect(getByText('Overview')).toBeTruthy();
    expect(getByText('Accounts')).toBeTruthy();
  });

  it('marks the active segment with accessibility selected state', () => {
    const { getByText } = render(
      <SegmentSwitcher value="accounts" onChange={() => {}} />,
    );
    const accountsBtn = getByText('Accounts').parent?.parent;
    expect(accountsBtn?.props.accessibilityState?.selected).toBe(true);
  });

  it('fires onChange with the tapped segment value', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SegmentSwitcher value="overview" onChange={onChange} />,
    );
    fireEvent.press(getByText('Accounts'));
    expect(onChange).toHaveBeenCalledWith('accounts');
  });

  it('does not fire onChange when tapping the already-active segment', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SegmentSwitcher value="overview" onChange={onChange} />,
    );
    fireEvent.press(getByText('Overview'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
