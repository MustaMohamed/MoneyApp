import { renderHook } from '@testing-library/react-native';

import { useSettings } from '@/modules/settings/screens/settings/settings.hook';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

describe('useSettings', () => {
  it('renders without throwing', async () => {
    await expect(renderHook(() => useSettings())).resolves.toBeDefined();
  });

  it('exposes navigation functions', async () => {
    const { result } = await renderHook(() => useSettings());
    expect(typeof result.current.goToCurrency).toBe('function');
    expect(typeof result.current.goToCategories).toBe('function');
    expect(typeof result.current.goBack).toBe('function');
  });

  it('exposes goToAbout (Task 8)', async () => {
    const { result } = await renderHook(() => useSettings());
    expect(typeof result.current.goToAbout).toBe('function');
  });

  it('goToAbout calls router.push with /settings/about', async () => {
    const pushMock = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({
      push: pushMock,
      back: jest.fn(),
    });
    const { result } = await renderHook(() => useSettings());
    result.current.goToAbout();
    expect(pushMock).toHaveBeenCalledWith('/settings/about');
  });
});
