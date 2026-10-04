import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent } from 'react-native';

import { useTransactionFormNoteReveal } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_note_reveal.hook';

const REST_HEIGHT = 377.9;
const MID_LIFT_HEIGHT = 300;
const LIFTED_HEIGHT = 228.57;
const FRAME_MS = 16;

const layoutOf = (height: number) =>
  ({ nativeEvent: { layout: { x: 0, y: 0, width: 411, height } } }) as LayoutChangeEvent;

async function mountReveal({ withScroll = true }: { withScroll?: boolean } = {}) {
  const scrollToEnd = jest.fn();
  const hook = await renderHook(() => useTransactionFormNoteReveal());
  if (withScroll) {
    hook.result.current.scrollRef.current = {
      scrollToEnd,
    } as unknown as BottomSheetScrollViewMethods;
  }
  return {
    scrollToEnd,
    scrollRef: () => hook.result.current.scrollRef,
    focusNote: () => act(() => hook.result.current.handleNoteFocus()),
    blurNote: () => act(() => hook.result.current.handleNoteBlur()),
    layout: (height: number) => act(() => hook.result.current.handleScrollLayout(layoutOf(height))),
    unmount: () => hook.unmount(),
  };
}

const runFrame = () =>
  act(() => {
    jest.advanceTimersByTime(FRAME_MS);
  });

describe('useTransactionFormNoteReveal', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('scrolls to the end once, unanimated, on the frame after the scroll shrinks with the Note focused', async () => {
    const reveal = await mountReveal();
    await reveal.focusNote();
    await reveal.layout(REST_HEIGHT);
    await reveal.layout(LIFTED_HEIGHT);
    expect(reveal.scrollToEnd).not.toHaveBeenCalled();

    await runFrame();
    expect(reveal.scrollToEnd).toHaveBeenCalledTimes(1);
    expect(reveal.scrollToEnd).toHaveBeenCalledWith({ animated: false });

    await runFrame();
    expect(reveal.scrollToEnd).toHaveBeenCalledTimes(1);
  });

  it('asks once for two shrinks inside one frame', async () => {
    const reveal = await mountReveal();
    await reveal.focusNote();
    await reveal.layout(REST_HEIGHT);
    await reveal.layout(MID_LIFT_HEIGHT);
    await reveal.layout(LIFTED_HEIGHT);

    await runFrame();
    expect(reveal.scrollToEnd).toHaveBeenCalledTimes(1);
  });

  it('asks again for a shrink that arrives after the waiting frame has run', async () => {
    const reveal = await mountReveal();
    await reveal.focusNote();
    await reveal.layout(REST_HEIGHT);
    await reveal.layout(MID_LIFT_HEIGHT);
    await runFrame();
    await reveal.layout(LIFTED_HEIGHT);

    await runFrame();
    expect(reveal.scrollToEnd).toHaveBeenCalledTimes(2);
    expect(reveal.scrollToEnd).toHaveBeenLastCalledWith({ animated: false });
  });

  it('asks nothing for the same layouts when the Note never took focus', async () => {
    const reveal = await mountReveal();
    await reveal.layout(REST_HEIGHT);
    await reveal.layout(LIFTED_HEIGHT);

    await runFrame();
    expect(reveal.scrollToEnd).not.toHaveBeenCalled();
  });

  it('asks nothing for a first layout alone', async () => {
    const reveal = await mountReveal();
    await reveal.focusNote();
    await reveal.layout(REST_HEIGHT);

    await runFrame();
    expect(reveal.scrollToEnd).not.toHaveBeenCalled();
  });

  it('asks nothing for an equal height', async () => {
    const reveal = await mountReveal();
    await reveal.focusNote();
    await reveal.layout(REST_HEIGHT);
    await reveal.layout(REST_HEIGHT);

    await runFrame();
    expect(reveal.scrollToEnd).not.toHaveBeenCalled();
  });

  it('asks nothing for a greater height', async () => {
    const reveal = await mountReveal();
    await reveal.focusNote();
    await reveal.layout(LIFTED_HEIGHT);
    await reveal.layout(REST_HEIGHT);

    await runFrame();
    expect(reveal.scrollToEnd).not.toHaveBeenCalled();
  });

  it('asks nothing for a shrink after the Note blurs', async () => {
    const reveal = await mountReveal();
    await reveal.focusNote();
    await reveal.layout(REST_HEIGHT);
    await reveal.blurNote();
    await reveal.layout(LIFTED_HEIGHT);

    await runFrame();
    expect(reveal.scrollToEnd).not.toHaveBeenCalled();
  });

  it('does not throw on a shrink while the scroll is not mounted', async () => {
    const reveal = await mountReveal({ withScroll: false });
    expect(reveal.scrollRef().current).toBeNull();
    await reveal.focusNote();
    await reveal.layout(REST_HEIGHT);
    await reveal.layout(LIFTED_HEIGHT);

    expect(() => jest.advanceTimersByTime(FRAME_MS)).not.toThrow();
  });

  it('asks nothing when the hook unmounts before the frame', async () => {
    const reveal = await mountReveal();
    await reveal.focusNote();
    await reveal.layout(REST_HEIGHT);
    await reveal.layout(LIFTED_HEIGHT);
    await reveal.unmount();

    await runFrame();
    expect(reveal.scrollToEnd).not.toHaveBeenCalled();
  });
});
