import { resolveStepperEnds } from '@/components/ui/stepper.helpers';

describe('resolveStepperEnds (MA-276)', () => {
  it('blocks decrease at the floor and opens it one above', () => {
    expect(resolveStepperEnds(1, 1, 365).canDecrease).toBe(false);
    expect(resolveStepperEnds(2, 1, 365).canDecrease).toBe(true);
  });

  it('blocks increase at the ceiling and opens it one below', () => {
    expect(resolveStepperEnds(365, 1, 365).canIncrease).toBe(false);
    expect(resolveStepperEnds(364, 1, 365).canIncrease).toBe(true);
  });

  it('opens increase at 10,000 with no ceiling', () => {
    expect(resolveStepperEnds(10_000, 1, undefined)).toEqual({
      canDecrease: true,
      canIncrease: true,
    });
  });
});
