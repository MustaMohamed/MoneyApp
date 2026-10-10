import {
  holdAlertToastClearance,
  holdToastClearance,
  resolveToastBottomClearance,
  useToastClearanceState,
} from '@/components/ui/toast_clearance.state';

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

describe('the floating alert hold (MA-161)', () => {
  beforeEach(() => {
    useToastClearanceState.getState().reset();
  });

  it('holds an alert clearance until its release runs', () => {
    const release = holdAlertToastClearance(240);
    expect(useToastClearanceState.getState().alertClearance).toBe(240);

    release();

    expect(useToastClearanceState.getState().alertClearance).toBeUndefined();
    expect(useToastClearanceState.getState().alertOwner).toBeUndefined();
  });

  it('leaves a later hold in place when an earlier release runs after it', () => {
    const releaseFirst = holdAlertToastClearance(240);
    const releaseSecond = holdAlertToastClearance(180);

    releaseFirst();
    expect(useToastClearanceState.getState().alertClearance).toBe(180);

    releaseSecond();
    expect(useToastClearanceState.getState().alertClearance).toBeUndefined();
  });

  it('resets a held alert clearance', () => {
    holdAlertToastClearance(240);

    useToastClearanceState.getState().reset();

    expect(useToastClearanceState.getState().alertClearance).toBeUndefined();
    expect(useToastClearanceState.getState().alertOwner).toBeUndefined();
  });

  it("keeps the tab bar's clearance through an alert hold and its release", () => {
    holdToastClearance(120);
    const release = holdAlertToastClearance(240);
    expect(useToastClearanceState.getState().bottomClearance).toBe(120);

    release();

    expect(useToastClearanceState.getState().bottomClearance).toBe(120);
  });
});

describe('resolveToastBottomClearance', () => {
  it.each<[number | undefined, number | undefined, number | undefined]>([
    [undefined, undefined, undefined],
    [120, undefined, 120],
    [undefined, 240, 240],
    [120, 240, 240],
    [300, 240, 300],
  ])('(%s, %s) -> %s', (bottomClearance, alertClearance, expected) => {
    expect(resolveToastBottomClearance(bottomClearance, alertClearance)).toBe(expected);
  });
});
