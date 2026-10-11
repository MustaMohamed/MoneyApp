import { renderHook } from '@testing-library/react-native';
import { Dimensions, type View } from 'react-native';

const mockFocusEffect = jest.fn<void, [() => void | (() => void)]>();

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => mockFocusEffect(effect),
}));

import { resolveFloatingAlertToastClearance } from '@/components/ui/load_error_alert.geometry';
import { useFloatingAlertToastHold } from '@/components/ui/load_error_alert.hook';
import { useToastClearanceState } from '@/components/ui/toast_clearance.state';

type MeasureCallback = (x: number, y: number, width: number, height: number) => void;

const WINDOW_HEIGHT = Dimensions.get('window').height;
const FIRST_TOP = 490.3;
const SECOND_TOP = 400;

const alertClearance = () => useToastClearanceState.getState().alertClearance;

async function mountFloatingAlert() {
  const measureInWindow = jest.fn<void, [MeasureCallback]>();
  const hook = await renderHook(() => useFloatingAlertToastHold());
  hook.result.current.frameRef.current = { measureInWindow } as unknown as View;
  let cleanup: (() => void) | undefined;
  return {
    focus: () => {
      const effect = mockFocusEffect.mock.calls.at(-1)?.[0];
      if (effect === undefined) throw new Error('useFocusEffect was never called');
      const returned = effect();
      if (typeof returned !== 'function') throw new Error('the focus effect returned no cleanup');
      cleanup = returned;
    },
    blur: () => {
      if (cleanup === undefined) throw new Error('blur before focus');
      cleanup();
    },
    layout: () => hook.result.current.holdClearance(),
    answerMeasure: (top: number) => {
      const answer = measureInWindow.mock.calls.at(-1)?.[0];
      if (answer === undefined) throw new Error('measureInWindow was never called');
      answer(16, top, 379.4, 64);
    },
  };
}

describe('useFloatingAlertToastHold', () => {
  beforeEach(() => {
    mockFocusEffect.mockClear();
    useToastClearanceState.getState().reset();
  });

  it("holds the toast clear of the alert's top when a measure answers while focused", async () => {
    const alert = await mountFloatingAlert();
    alert.focus();

    alert.answerMeasure(FIRST_TOP);

    expect(alertClearance()).toBe(resolveFloatingAlertToastClearance(WINDOW_HEIGHT, FIRST_TOP));
  });

  it('holds nothing when a measure answers after blur', async () => {
    const alert = await mountFloatingAlert();
    alert.focus();
    alert.blur();

    alert.answerMeasure(FIRST_TOP);

    expect(alertClearance()).toBeUndefined();
  });

  it('clears its hold on blur', async () => {
    const alert = await mountFloatingAlert();
    alert.focus();
    alert.answerMeasure(FIRST_TOP);
    expect(alertClearance()).toBe(resolveFloatingAlertToastClearance(WINDOW_HEIGHT, FIRST_TOP));

    alert.blur();

    expect(alertClearance()).toBeUndefined();
  });

  it('replaces its hold on a second layout, and the first release then clears nothing', async () => {
    const alert = await mountFloatingAlert();
    alert.focus();
    alert.answerMeasure(FIRST_TOP);
    const firstOwner = useToastClearanceState.getState().alertOwner;
    if (firstOwner === undefined) throw new Error('the first hold set no owner');

    alert.layout();
    alert.answerMeasure(SECOND_TOP);
    const secondClearance = resolveFloatingAlertToastClearance(WINDOW_HEIGHT, SECOND_TOP);
    expect(alertClearance()).toBe(secondClearance);

    useToastClearanceState.getState().releaseAlert(firstOwner);
    expect(alertClearance()).toBe(secondClearance);

    alert.blur();
    expect(alertClearance()).toBeUndefined();
  });
});
