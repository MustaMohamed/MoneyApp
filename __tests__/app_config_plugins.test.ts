import fs from 'node:fs';
import path from 'node:path';

const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8')) as {
  expo: Record<string, any>;
};
const { expo } = appJson;

const pluginName = (p: unknown) => (Array.isArray(p) ? (p[0] as string) : (p as string));

describe('app.json plugin contract', () => {
  it('lists exactly these plugins, in this order', () => {
    // Frozen deliberately: a legitimate plugin change updates this array in the same commit.
    expect(expo.plugins.map(pluginName)).toEqual([
      'expo-router',
      'expo-sqlite',
      'expo-secure-store',
      'expo-font',
      'expo-splash-screen',
      'expo-build-properties',
      'expo-web-browser',
      'expo-image',
      'expo-status-bar',
    ]);
  });

  it('does not list @react-native-community/datetimepicker', () => {
    // Its plugin is a no-op with no options, and `expo install --fix` keeps re-adding it.
    expect(expo.plugins.map(pluginName)).not.toContain('@react-native-community/datetimepicker');
  });

  it('points the four icon and splash surfaces at the committed assets', () => {
    expect(expo.icon).toBe('./assets/icon.png');
    expect(expo.ios.icon).toBe('./assets/icon.png');
    expect(expo.android.adaptiveIcon.foregroundImage).toBe('./assets/adaptive-icon.png');
    expect(expo.android.adaptiveIcon.backgroundColor).toBe('#0F1923');
  });

  it('compiles React Native from source on Android only, so the patched text view ships', () => {
    const buildProperties = expo.plugins.find(
      (p: unknown) => pluginName(p) === 'expo-build-properties',
    ) as [string, Record<string, unknown>] | undefined;
    expect(buildProperties).toBeDefined();
    expect(buildProperties?.[1]).toEqual({
      android: { newArchEnabled: true, buildReactNativeFromSource: true },
      ios: { newArchEnabled: true },
    });
  });

  it('keeps the splash options that make the Android 12 mask safe', () => {
    const splash = expo.plugins.find((p: unknown) => pluginName(p) === 'expo-splash-screen') as [
      string,
      Record<string, unknown>,
    ];
    expect(splash[1]).toEqual({
      image: './assets/splash.png',
      imageWidth: 100,
      resizeMode: 'contain',
      backgroundColor: '#0F1923',
      dark: { backgroundColor: '#0F1923' },
    });
    // Android's 192dp icon circle clips a centred square past 2*96/sqrt(2) = 135.76dp.
    expect(splash[1].imageWidth as number).toBeLessThanOrEqual(135);
  });
});

describe('patches contract', () => {
  const root = path.join(__dirname, '..');
  const patches = fs.readdirSync(path.join(root, 'patches')).filter((f) => f.endsWith('.patch'));
  const installedVersion = (name: string) =>
    (
      JSON.parse(
        fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8'),
      ) as { version: string }
    ).version;

  it('holds a react-native patch for the installed react-native version', () => {
    expect(patches).toContain(`react-native+${installedVersion('react-native')}.patch`);
  });

  it('names every patch for the installed version of its package', () => {
    expect(patches.length).toBeGreaterThan(0);
    for (const file of patches) {
      // patch-package names a scoped package `@scope+name+<version>.patch`.
      const parts = file.slice(0, -'.patch'.length).split('+');
      const version = parts.pop();
      const name = parts.join('/');
      expect(`${name}@${version}`).toBe(`${name}@${installedVersion(name)}`);
    }
  });
});
