import { holdToastClearance, useToastClearanceState } from '@/components/ui/toast_clearance.state';

describe('useToastClearanceState', () => {
  beforeEach(() => {
    useToastClearanceState.getState().reset();
  });

  it('starts with no clearance', () => {
    expect(useToastClearanceState.getState().bottomClearance).toBeUndefined();
  });

  it('publishes a clearance and clears it', () => {
    useToastClearanceState.getState().publish(120);
    expect(useToastClearanceState.getState().bottomClearance).toBe(120);

    useToastClearanceState.getState().clear();
    expect(useToastClearanceState.getState().bottomClearance).toBeUndefined();
  });

  it('holds a clearance until the returned release runs', () => {
    const release = holdToastClearance(120);
    expect(useToastClearanceState.getState().bottomClearance).toBe(120);

    release();
    expect(useToastClearanceState.getState().bottomClearance).toBeUndefined();
  });

  it('resets to the initial state', () => {
    useToastClearanceState.getState().publish(120);

    useToastClearanceState.getState().reset();

    expect(useToastClearanceState.getState().bottomClearance).toBeUndefined();
  });
});
