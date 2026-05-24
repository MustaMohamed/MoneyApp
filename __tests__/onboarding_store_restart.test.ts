import * as SecureStore from 'expo-secure-store';

import { OnboardingStep } from '@/constants/enums';
// Import after mocks are in place
import { loadOnboardingState } from '@/store/onboarding.store';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Minimal repo stub — loadOnboardingState calls AppSettingsRepository internally
// via the store singleton, but the store singleton is created at module load time.
// We mock the repository to avoid SQLite in tests.
jest.mock('@/repositories/app_settings.repository', () => ({
  AppSettingsRepository: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  })),
}));

const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;

describe('loadOnboardingState — legacy O* migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItemAsync.mockResolvedValue(undefined);
  });

  it('migrates any persisted O* step to N1 and rewrites secure store', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'onboarding_step') return Promise.resolve('O3');
      if (key === 'onboarding_complete') return Promise.resolve('false');
      if (key === 'base_currency') return Promise.resolve('EGP');
      return Promise.resolve(null);
    });

    const result = await loadOnboardingState();

    expect(result.step).toBe(OnboardingStep.N1);
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      expect.stringContaining('onboarding_step'),
      OnboardingStep.N1,
    );
  });

  it('does NOT restart when persisted step is already an N* value', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'onboarding_step') return Promise.resolve('N3');
      if (key === 'onboarding_complete') return Promise.resolve('false');
      if (key === 'base_currency') return Promise.resolve('EGP');
      return Promise.resolve(null);
    });

    const result = await loadOnboardingState();

    expect(result.step).toBe(OnboardingStep.N3);
    // setItemAsync should NOT have been called for the restart (it may be called by other store actions but not specifically for force-restart)
    const restartCall = mockSetItemAsync.mock.calls.find(([, v]) => v === OnboardingStep.N1);
    expect(restartCall).toBeUndefined();
  });
});
