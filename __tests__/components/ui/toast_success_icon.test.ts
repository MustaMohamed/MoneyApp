import { fireEvent, render, renderHook } from '@testing-library/react-native';
import type { ToastShowOptions } from 'heroui-native';
import { createElement, type ReactElement } from 'react';
import { View } from 'react-native';

import { scaledLineHeight } from '@/components/ui/text_scale.geometry';
import { resolveToastActionHeight, useToast } from '@/components/ui/toast';
import { Colors, Size, Type } from '@/constants/theme';

jest.mock('react-native-reanimated', () =>
  jest
    .requireActual<typeof import('@/test_helpers/mock_reanimated_fade')>(
      '@/test_helpers/mock_reanimated_fade',
    )
    .mockReanimatedFade(),
);

// A host Text carrying the glyph's props, so the test finds it by name, not by JSX nesting.
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { createElement: create } = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return ({ name, size, color }: { name: string; size: number; color: string }) =>
    create(Text, { testID: `icon-${name}`, style: { color, fontSize: size } }, name);
});

const heroui = jest.requireMock<typeof import('heroui-native')>('heroui-native');
const heroToast = heroui.useToast().toast;
const heroShow = jest.mocked(heroToast.show);

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
  it('puts the check-circle, in the success colour, before a success label in the default variant', async () => {
    const { result } = await renderHook(() => useToast());

    result.current.toast.show({ label: 'x', variant: 'success' });

    const options = forwarded() as { icon: ReactElement };
    expect(options).toEqual({ label: 'x', variant: 'default', icon: expect.anything() });
    const { getByTestId } = await render(options.icon);
    expect(getByTestId('icon-check-circle')).toHaveStyle({
      color: Colors.dark.positive,
      fontSize: Size.toastIcon,
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

  it('keeps an icon the caller supplied on a success config, in the default variant', async () => {
    const { result } = await renderHook(() => useToast());
    const icon = createElement(View);

    result.current.toast.show({ label: 'x', variant: 'success', icon });

    const options = forwarded() as { icon: ReactElement };
    expect(options).toEqual({ label: 'x', variant: 'default', icon: expect.anything() });
    expect(options.icon).toBe(icon);
  });

  it('puts the check-circle on a success config whose component is undefined', async () => {
    const { result } = await renderHook(() => useToast());

    result.current.toast.show({ label: 'x', variant: 'success', component: undefined });

    expect(forwarded()).toEqual({ label: 'x', variant: 'default', icon: expect.anything() });
  });

  it('forwards a custom component call untouched', async () => {
    const { result } = await renderHook(() => useToast());
    const options: ToastShowOptions = { component: () => createElement(View) };

    result.current.toast.show(options);

    expect(forwarded()).toBe(options);
  });

  describe('a success config with an action (MA-215)', () => {
    type ActionToast = (props: { id: string; show: jest.Mock; hide: jest.Mock }) => ReactElement;

    async function showActionToast(extra: Partial<ToastShowOptions> = {}) {
      const onActionPress = jest.fn();
      const { result } = await renderHook(() => useToast());

      result.current.toast.show({
        label: 'Rent skipped',
        variant: 'success',
        actionLabel: 'Undo',
        onActionPress,
        ...extra,
      } as ToastShowOptions);

      return { options: forwarded() as { component: ActionToast }, onActionPress };
    }

    async function renderActionToast() {
      const show = jest.fn();
      const hide = jest.fn();
      const { options, onActionPress } = await showActionToast();
      const view = await render(createElement(options.component, { id: 'toast-1', show, hide }));
      return { ...view, show, hide, onActionPress };
    }

    it('forwards a component and no variant, label or icon', async () => {
      const { options } = await showActionToast();

      expect(options).toEqual({ component: expect.any(Function) });
    });

    it('keeps the id, the duration and the show and hide hooks beside the component', async () => {
      const onShow = jest.fn();
      const onHide = jest.fn();

      const { options } = await showActionToast({ id: 'skip', duration: 4000, onShow, onHide });

      expect(options).toEqual({
        id: 'skip',
        duration: 4000,
        onShow,
        onHide,
        component: expect.any(Function),
      });
    });

    it('draws the check, the label and the action', async () => {
      const { getByTestId, getByText } = await renderActionToast();

      expect(getByTestId('icon-check-circle')).toHaveStyle({
        color: Colors.dark.positive,
        fontSize: Size.toastIcon,
      });
      expect(getByText('Rent skipped')).toBeTruthy();
      expect(getByText('Undo')).toBeTruthy();
    });

    it('hides this toast, then runs the action once with show and hide', async () => {
      const { getByText, show, hide, onActionPress } = await renderActionToast();

      await fireEvent.press(getByText('Undo'));

      expect(hide).toHaveBeenCalledTimes(1);
      expect(hide).toHaveBeenCalledWith('toast-1');
      expect(onActionPress).toHaveBeenCalledTimes(1);
      expect(onActionPress).toHaveBeenCalledWith({ show, hide });
      expect(hide.mock.invocationCallOrder[0]).toBeLessThan(
        onActionPress.mock.invocationCallOrder[0],
      );
    });
  });

  it('sizes the action to one body line at font scale 2', () => {
    expect(resolveToastActionHeight(2)).toBe(scaledLineHeight(Type.body, 2));
  });

  it('hands back the HeroUI hide and visibility flag', async () => {
    jest.spyOn(heroui, 'useToast').mockReturnValue({ toast: heroToast, isToastVisible: true });
    const { result } = await renderHook(() => useToast());

    expect(result.current.toast.hide).toBe(heroToast.hide);
    expect(result.current.isToastVisible).toBe(true);
  });

  it('keeps the toast object while the HeroUI one is unchanged', async () => {
    const { result, rerender } = await renderHook(() => useToast());
    const first = result.current.toast;

    await rerender(undefined);

    expect(result.current.toast).toBe(first);
  });
});
