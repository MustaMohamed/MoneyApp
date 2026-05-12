import { renderHook } from '@testing-library/react-native';

import { useSettings } from '@/screens/settings/settings.hook';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

describe('useSettings', () => {
  it('renders without throwing', () => {
    expect(() => renderHook(() => useSettings())).not.toThrow();
  });

  it('exposes navigation functions', () => {
    const { result } = renderHook(() => useSettings());
    expect(typeof result.current.goToCurrency).toBe('function');
    expect(typeof result.current.goToCategories).toBe('function');
    expect(typeof result.current.goBack).toBe('function');
  });

  it('exposes goToAbout (Task 8)', () => {
    const { result } = renderHook(() => useSettings());
    expect(typeof result.current.goToAbout).toBe('function');
  });

  it('goToAbout calls router.push with /settings/about', () => {
    const pushMock = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({
      push: pushMock,
      back: jest.fn(),
    });
    const { result } = renderHook(() => useSettings());
    result.current.goToAbout();
    expect(pushMock).toHaveBeenCalledWith('/settings/about');
  });
});
