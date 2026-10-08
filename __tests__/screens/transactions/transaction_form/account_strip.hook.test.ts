import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { TransactionType } from '@/constants/enums';
import { Spacing } from '@/constants/theme';
import { useAccountStripReveal } from '@/modules/transactions/screens/transactions/transaction_form/components/account_strip.hook';
import {
  ACCOUNT_STRIP_CHIP_HEIGHT,
  ACCOUNT_STRIP_CHIP_WIDTH,
  ACCOUNT_STRIP_GAP,
} from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry';
import { ms } from '@/utils/responsive';

const FRAME_MS = 16;
const VIEWPORT = ms(390) - 2 * Spacing.md;
const CHIP_PITCH = ACCOUNT_STRIP_CHIP_WIDTH + ACCOUNT_STRIP_GAP;
const leftEdgeOf = (index: number) => index * CHIP_PITCH;
const offsetShowingFromTheRight = (index: number) =>
  leftEdgeOf(index) + ACCOUNT_STRIP_CHIP_WIDTH - VIEWPORT;

// At offset 0 chips 0 and 1 lie whole in VIEWPORT and chip 2 is cut; at PAST_CHIP_ONE chip 1 lies left of the offset.
const IN_VIEW = 1;
const CUT = 2;
const PAST_THE_EDGE = 6;
const PAST_CHIP_ONE = leftEdgeOf(3);

const layoutOf = (width: number) =>
  ({
    nativeEvent: { layout: { x: 0, y: 0, width, height: ACCOUNT_STRIP_CHIP_HEIGHT } },
  }) as LayoutChangeEvent;

const scrollOf = (x: number) =>
  ({ nativeEvent: { contentOffset: { x, y: 0 } } }) as NativeSyntheticEvent<NativeScrollEvent>;

const animatedTo = (x: number) => ({ x: expect.closeTo(x, 5) as unknown, animated: true });

interface StripProps {
  selectedIndex: number;
  type: TransactionType;
}

async function mountStrip(selectedIndex: number, type = TransactionType.Expense) {
  const scrollTo = jest.fn();
  const hook = await renderHook(
    (props: StripProps) => useAccountStripReveal(props.selectedIndex, props.type),
    { initialProps: { selectedIndex, type } },
  );
  hook.result.current.scrollRef.current = { scrollTo } as unknown as BottomSheetScrollViewMethods;
  return {
    scrollTo,
    layout: (width: number) => act(() => hook.result.current.handleLayout(layoutOf(width))),
    recordScroll: (x: number) => act(() => hook.result.current.handleScroll(scrollOf(x))),
    press: (index: number) => act(() => hook.result.current.handleChipPress(index)),
    setProps: (props: StripProps) => hook.rerender(props),
    unmountScroll: () => {
      hook.result.current.scrollRef.current = null;
    },
    mountScroll: () => {
      hook.result.current.scrollRef.current = {
        scrollTo,
      } as unknown as BottomSheetScrollViewMethods;
    },
  };
}

const runFrame = () =>
  act(() => {
    jest.advanceTimersByTime(FRAME_MS);
  });

async function mountLaidOut(selectedIndex: number) {
  const strip = await mountStrip(selectedIndex);
  await strip.layout(VIEWPORT);
  await runFrame();
  return strip;
}

describe('useAccountStripReveal', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('scrolls once, on the frame after the first layout, to the offset that shows a selected chip past the edge', async () => {
    const strip = await mountStrip(PAST_THE_EDGE);
    await strip.layout(VIEWPORT);
    expect(strip.scrollTo).not.toHaveBeenCalled();

    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);
    expect(strip.scrollTo).toHaveBeenLastCalledWith(
      animatedTo(offsetShowingFromTheRight(PAST_THE_EDGE)),
    );

    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('never scrolls for a selected chip that lies whole in view', async () => {
    const strip = await mountStrip(IN_VIEW);
    await strip.layout(VIEWPORT);
    await runFrame();
    await runFrame();

    expect(strip.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls on the frame after a new selectedIndex whose chip is cut', async () => {
    const strip = await mountLaidOut(IN_VIEW);
    await strip.setProps({ selectedIndex: CUT, type: TransactionType.Expense });
    expect(strip.scrollTo).not.toHaveBeenCalled();

    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);
    expect(strip.scrollTo).toHaveBeenLastCalledWith(animatedTo(offsetShowingFromTheRight(CUT)));
  });

  it('scrolls once under a new type when a recorded scroll has left the same selected chip out of view', async () => {
    const strip = await mountLaidOut(IN_VIEW);
    await strip.recordScroll(PAST_CHIP_ONE);
    await strip.setProps({ selectedIndex: IN_VIEW, type: TransactionType.Income });
    expect(strip.scrollTo).not.toHaveBeenCalled();

    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);
    expect(strip.scrollTo).toHaveBeenLastCalledWith(animatedTo(leftEdgeOf(IN_VIEW)));

    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('never scrolls under a new type while the selected chip lies whole in view', async () => {
    const strip = await mountLaidOut(IN_VIEW);
    await strip.setProps({ selectedIndex: IN_VIEW, type: TransactionType.Income });
    await runFrame();

    expect(strip.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls once on a press of the selected chip that a recorded scroll has left out of view', async () => {
    const strip = await mountLaidOut(IN_VIEW);
    await strip.recordScroll(PAST_CHIP_ONE);
    await strip.press(IN_VIEW);
    expect(strip.scrollTo).not.toHaveBeenCalled();

    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);
    expect(strip.scrollTo).toHaveBeenLastCalledWith(animatedTo(leftEdgeOf(IN_VIEW)));

    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('never scrolls on a press of the selected chip while it lies whole in view', async () => {
    const strip = await mountLaidOut(IN_VIEW);
    await strip.press(IN_VIEW);
    await runFrame();

    expect(strip.scrollTo).not.toHaveBeenCalled();
  });

  it('calls nothing on a press of any other chip, with the selected chip out of view', async () => {
    const strip = await mountLaidOut(IN_VIEW);
    await strip.recordScroll(PAST_CHIP_ONE);
    await strip.press(PAST_THE_EDGE);
    await strip.press(0);
    await runFrame();

    expect(strip.scrollTo).not.toHaveBeenCalled();
  });

  it('calls nothing for a recorded scroll alone, and the next reveal reads that offset', async () => {
    const strip = await mountLaidOut(CUT);
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);
    const [landed] = strip.scrollTo.mock.calls[0] as [{ x: number }];

    await strip.recordScroll(landed.x);
    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);

    await strip.press(CUT);
    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);

    await strip.recordScroll(leftEdgeOf(PAST_THE_EDGE));
    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);

    await strip.press(CUT);
    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(2);
    expect(strip.scrollTo).toHaveBeenLastCalledWith(animatedTo(leftEdgeOf(CUT)));
  });

  it('computes the first reveal from offset 0 once a type with no chip has unmounted the scroll view', async () => {
    const strip = await mountLaidOut(IN_VIEW);
    await strip.recordScroll(leftEdgeOf(PAST_THE_EDGE - 1));
    await strip.setProps({ selectedIndex: PAST_THE_EDGE, type: TransactionType.Expense });
    await runFrame();
    expect(strip.scrollTo).not.toHaveBeenCalled();

    strip.unmountScroll();
    await strip.setProps({ selectedIndex: -1, type: TransactionType.Transfer });
    await runFrame();
    strip.mountScroll();
    await strip.setProps({ selectedIndex: PAST_THE_EDGE, type: TransactionType.Expense });
    expect(strip.scrollTo).not.toHaveBeenCalled();

    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);
    expect(strip.scrollTo).toHaveBeenLastCalledWith(
      animatedTo(offsetShowingFromTheRight(PAST_THE_EDGE)),
    );
  });

  it('computes the first reveal from offset 0 when a scroll event lands after the scroll view has unmounted', async () => {
    const offsetShowingTheChipWhole = leftEdgeOf(PAST_THE_EDGE - 1);
    const strip = await mountLaidOut(IN_VIEW);
    await strip.recordScroll(offsetShowingTheChipWhole);
    await strip.setProps({ selectedIndex: PAST_THE_EDGE, type: TransactionType.Expense });
    await runFrame();
    expect(strip.scrollTo).not.toHaveBeenCalled();

    strip.unmountScroll();
    await strip.setProps({ selectedIndex: -1, type: TransactionType.Transfer });
    await strip.recordScroll(offsetShowingTheChipWhole);
    await runFrame();
    strip.mountScroll();
    await strip.setProps({ selectedIndex: PAST_THE_EDGE, type: TransactionType.Expense });
    expect(strip.scrollTo).not.toHaveBeenCalled();

    await runFrame();
    expect(strip.scrollTo).toHaveBeenCalledTimes(1);
    expect(strip.scrollTo).toHaveBeenLastCalledWith(
      animatedTo(offsetShowingFromTheRight(PAST_THE_EDGE)),
    );
  });

  it('never scrolls while no chip is selected', async () => {
    const strip = await mountLaidOut(-1);
    await strip.setProps({ selectedIndex: -1, type: TransactionType.Transfer });
    await runFrame();
    await strip.recordScroll(PAST_CHIP_ONE);
    await strip.setProps({ selectedIndex: -1, type: TransactionType.Expense });
    await runFrame();

    expect(strip.scrollTo).not.toHaveBeenCalled();
  });
});
