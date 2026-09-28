import { resolveKeyboardLift } from '@/components/ui/keyboard_lift.geometry';

describe('resolveKeyboardLift', () => {
  it('lifts by the whole keyboard on Android, whose height already excludes the navigation bar', () => {
    expect(resolveKeyboardLift('android', 300, 48)).toBe(300);
  });

  it('lifts by the keyboard less the bottom inset Screen already pads on iOS', () => {
    expect(resolveKeyboardLift('ios', 336, 34)).toBe(302);
  });

  it('never lifts below zero', () => {
    expect(resolveKeyboardLift('ios', 20, 34)).toBe(0);
    expect(resolveKeyboardLift('android', 0, 48)).toBe(0);
  });
});
