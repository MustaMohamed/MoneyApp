// `__esModule: true` is required because `Constants.js` uses `export default` (ESM).
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.2.3',
      extra: {
        buildNumber: '42',
      },
    },
  },
}));

import { useAbout } from '@/modules/settings/screens/settings/about/about.hook';

describe('useAbout', () => {
  it('returns version from expoConfig', () => {
    const result = useAbout();
    expect(result.state.version).toBe('1.2.3');
  });

  it('returns buildNumber from expoConfig.extra', () => {
    const result = useAbout();
    expect(result.state.build).toBe('42');
  });
});
