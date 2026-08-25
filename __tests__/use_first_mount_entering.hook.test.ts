import { renderHook } from '@testing-library/react-native';

import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

// The hook's "seen" set is module state, not reset between tests in this
// file — each case below uses its own key so no test can observe another's
// claim.
describe('useFirstMountEntering — claim gating (#247)', () => {
  it('claim=false consumes nothing: a later claim=true render still claims the key', async () => {
    const key = 'consumes-nothing';
    const { result: discarding } = await renderHook(() => useFirstMountEntering(key, false));
    expect(discarding.current).toBe(false);

    const { result: claiming } = await renderHook(() => useFirstMountEntering(key));
    expect(claiming.current).toBe(true);
  });

  it('a second mount of an already-claimed key returns false — once per session', async () => {
    const key = 'once-per-session';
    const { result: first } = await renderHook(() => useFirstMountEntering(key));
    expect(first.current).toBe(true);

    const { result: second } = await renderHook(() => useFirstMountEntering(key));
    expect(second.current).toBe(false);
  });

  it('distinct keys claim independently', async () => {
    const { result: a } = await renderHook(() => useFirstMountEntering('distinct-a'));
    const { result: b } = await renderHook(() => useFirstMountEntering('distinct-b'));
    expect(a.current).toBe(true);
    expect(b.current).toBe(true);
  });

  it('a mid-mount claim=false flip does not change an already-latched true value', async () => {
    const key = 'latched-true';
    const { result, rerender } = await renderHook(
      ({ claim }: { claim: boolean }) => useFirstMountEntering(key, claim),
      { initialProps: { claim: true } },
    );
    expect(result.current).toBe(true);

    await rerender({ claim: false });
    expect(result.current).toBe(true);
  });

  it('a mid-mount claim=false flip does not change an already-latched false value', async () => {
    const key = 'latched-false';
    // Claim the key on an earlier mount so this instance's first render finds
    // it already seen.
    await renderHook(() => useFirstMountEntering(key));

    const { result, rerender } = await renderHook(
      ({ claim }: { claim: boolean }) => useFirstMountEntering(key, claim),
      { initialProps: { claim: true } },
    );
    expect(result.current).toBe(false);

    await rerender({ claim: false });
    expect(result.current).toBe(false);
  });
});
