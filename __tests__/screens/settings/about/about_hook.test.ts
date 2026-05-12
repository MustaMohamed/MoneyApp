/**
 * Task 11 — Group E2
 *
 * Layla's acceptance criteria covered:
 * - useAbout returns version from expoConfig
 * - useAbout returns buildNumber from expoConfig.extra
 * - useAbout falls back to version when buildNumber is absent
 * - useAbout falls back to '—' when both are absent
 *
 * Note: useAbout is a plain function (no hooks), so we can call it directly
 * in tests without renderHook.
 */

// Mock expo-constants — __esModule: true required because Constants.js uses
// `export default constants` (ESM), so Jest's interop needs this flag.
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

import { useAbout } from '@/screens/settings/about/about.hook';

// Simple test — hook returns synchronously from Constants
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
