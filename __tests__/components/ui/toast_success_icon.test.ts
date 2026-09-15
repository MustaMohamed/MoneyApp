import { renderHook } from '@testing-library/react-native';
import type { ToastShowOptions } from 'heroui-native';
import { createElement, type ReactElement } from 'react';
import { View } from 'react-native';

import { useToast } from '@/components/ui/toast';
import { Colors, Size } from '@/constants/theme';

const heroui = jest.requireMock<typeof import('heroui-native')>('heroui-native');
const heroToast = heroui.useToast().toast;
const heroShow = jest.mocked(heroToast.show);

type GlyphProps = { name: string; size: number; color: string };

function forwarded(): unknown {
  expect(heroShow).toHaveBeenCalledTimes(1);
  return heroShow.mock.calls[0]?.[0];
}

beforeEach(() => {
  heroShow.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the wrapper toast', () => {
  it('puts the check-circle, in the success colour, before a success label', async () => {
    const { result } = await renderHook(() => useToast());

    result.current.toast.show({ label: 'x', variant: 'success' });

    const options = forwarded() as { icon: ReactElement<{ children: ReactElement<GlyphProps> }> };
    expect(options).toEqual({ label: 'x', variant: 'success', icon: expect.anything() });
    expect(options.icon.props.children.props).toMatchObject({
      name: 'check-circle',
      size: Size.toastIcon,
      color: Colors.dark.positive,
    });
  });

  it('forwards a danger config as the caller passed it, with no icon', async () => {
    const { result } = await renderHook(() => useToast());
    const options: ToastShowOptions = { label: 'x', variant: 'danger' };

    result.current.toast.show(options);

    expect(forwarded()).toBe(options);
  });

  it('forwards a plain string', async () => {
    const { result } = await renderHook(() => useToast());

    result.current.toast.show('x');

    expect(forwarded()).toBe('x');
  });

  it('keeps an icon the caller supplied', async () => {
    const { result } = await renderHook(() => useToast());
    const options: ToastShowOptions = {
      label: 'x',
      variant: 'success',
      icon: createElement(View),
    };

    result.current.toast.show(options);

    expect(forwarded()).toBe(options);
  });

  it('forwards a custom component call untouched', async () => {
    const { result } = await renderHook(() => useToast());
    const options: ToastShowOptions = { component: () => createElement(View) };

    result.current.toast.show(options);

    expect(forwarded()).toBe(options);
  });

  it('hands back the HeroUI hide and visibility flag', async () => {
    jest.spyOn(heroui, 'useToast').mockReturnValue({ toast: heroToast, isToastVisible: true });
    const { result } = await renderHook(() => useToast());

    expect(result.current.toast.hide).toBe(heroToast.hide);
    expect(result.current.isToastVisible).toBe(true);
  });

  it('keeps one toast object across renders, so a caller useCallback dep holds', async () => {
    const { result, rerender } = await renderHook(() => useToast());
    const first = result.current.toast;

    await rerender(undefined);

    expect(result.current.toast).toBe(first);
  });
});
