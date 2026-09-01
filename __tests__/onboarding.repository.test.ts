import * as SecureStore from 'expo-secure-store';

import { OnboardingStep } from '@/constants/enums';
import { OnboardingRepository } from '@/modules/onboarding/repositories/onboarding.repository';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Jest setup adds test-only __reset to the mocked SecureStore module
const secure = SecureStore as unknown as {
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
  __reset: () => void;
};

function makeSettingsRepo(): jest.Mocked<IAppSettingsRepository> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    setMany: jest.fn().mockResolvedValue(undefined),
  };
}

let settingsRepo: jest.Mocked<IAppSettingsRepository>;
let repository: OnboardingRepository;

beforeEach(() => {
  secure.__reset();
  jest.clearAllMocks();
  settingsRepo = makeSettingsRepo();
  repository = new OnboardingRepository(settingsRepo);
});

describe('OnboardingRepository', () => {
  it('persists onboarding step to SecureStore', async () => {
    await repository.setStep(OnboardingStep.N2);
    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_step', 'N2');
  });

  it('persists onboarding completion to SecureStore and app settings', async () => {
    await repository.complete();
    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_complete', 'true');
    expect(settingsRepo.set.mock.calls).toEqual([['onboarding_complete', 'true']]);
  });

  it('loads defaults when SecureStore is empty', async () => {
    await expect(repository.load()).resolves.toEqual({
      complete: false,
      step: OnboardingStep.N1,
    });
  });

  it('loads persisted onboarding state', async () => {
    await secure.setItemAsync('onboarding_complete', 'true');
    await secure.setItemAsync('onboarding_step', 'N3');

    await expect(repository.load()).resolves.toEqual({
      complete: true,
      step: OnboardingStep.N3,
    });
  });

  it('normalizes retired O* onboarding steps to N1', async () => {
    await secure.setItemAsync('onboarding_step', 'O3');

    const result = await repository.load();

    expect(result.step).toBe(OnboardingStep.N1);
    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_step', OnboardingStep.N1);
  });
});
