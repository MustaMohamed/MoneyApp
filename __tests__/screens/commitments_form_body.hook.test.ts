import { act, renderHook } from '@testing-library/react-native';

import { useCommitmentFormBodyPickers } from '@/modules/commitments/screens/commitments/components/commitment_form_body.hook';
import { useCommitmentFormBodyState } from '@/modules/commitments/screens/commitments/components/commitment_form_body.state';

const entries = () => useCommitmentFormBodyState.getState().entries;

// Mounts the lower copy first, so each copy's owner is read off the key its mount added.
async function mountTwoCopies() {
  const lower = await renderHook(() => useCommitmentFormBodyPickers());
  const [lowerOwner] = Object.keys(entries());
  const upper = await renderHook(() => useCommitmentFormBodyPickers());
  return { lower, lowerOwner, upper };
}

beforeEach(() => {
  useCommitmentFormBodyState.getState().reset();
});

describe('useCommitmentFormBodyPickers', () => {
  it('a picker or date picker opened on one mounted copy stays closed on the other', async () => {
    const { lower, upper } = await mountTwoCopies();

    await act(async () => lower.result.current.setCategoryPickerVisible(true));
    await act(async () => upper.result.current.setShowStartDatePicker(true));

    expect(lower.result.current.categoryPickerVisible).toBe(true);
    expect(upper.result.current.categoryPickerVisible).toBe(false);
    expect(upper.result.current.showStartDatePicker).toBe(true);
    expect(lower.result.current.showStartDatePicker).toBe(false);
  });

  it('unmounting one copy leaves the other copy open picker as it was', async () => {
    const { lower, lowerOwner, upper } = await mountTwoCopies();
    await act(async () => lower.result.current.setAccountPickerVisible(true));
    const shown = entries()[lowerOwner];

    expect(Object.keys(entries())).toHaveLength(2);

    await upper.unmount();

    expect(Object.keys(entries())).toEqual([lowerOwner]);
    expect(entries()[lowerOwner]).toBe(shown);
    expect(lower.result.current.accountPickerVisible).toBe(true);
  });

  it('unmounting both copies leaves no entry behind', async () => {
    const { lower, upper } = await mountTwoCopies();
    await act(async () => upper.result.current.setShowEndDatePicker(true));

    await upper.unmount();
    await lower.unmount();

    expect(entries()).toEqual({});
  });
});
