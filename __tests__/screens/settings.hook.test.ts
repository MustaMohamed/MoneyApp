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
});
