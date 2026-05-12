import * as SecureStore from 'expo-secure-store';
import { OnboardingStep } from '@/constants/enums';

// Import after mocks are in place
import { loadOnboardingState } from '@/store/onboarding.store';

// We need to control FeatureFlags before the module loads.
// jest.mock hoists above imports, so this fires before loadOnboardingState imports it.
jest.mock('@/constants/feature_flags', () => ({
  FeatureFlags: { newOnboarding: true },
}));

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

describe('loadOnboardingState — force-restart when flag=true', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItemAsync.mockResolvedValue(undefined);
  });

  it('force-restarts to N1 when flag=true and persisted step is an O* value', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'onboarding_step') return Promise.resolve('O3');
      if (key === 'onboarding_complete') return Promise.resolve('false');
      if (key === 'base_currency') return Promise.resolve('EGP');
      if (key === 'security_choice') return Promise.resolve(null);
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
      if (key === 'security_choice') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const result = await loadOnboardingState();

    expect(result.step).toBe(OnboardingStep.N3);
    // setItemAsync should NOT have been called for the restart (it may be called by other store actions but not specifically for force-restart)
    const restartCall = mockSetItemAsync.mock.calls.find(([, v]) => v === OnboardingStep.N1);
    expect(restartCall).toBeUndefined();
  });
});
