import fs from 'node:fs';
import path from 'node:path';

const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8')) as {
  expo: Record<string, any>;
};
const { expo } = appJson;

const pluginName = (p: unknown) => (Array.isArray(p) ? (p[0] as string) : (p as string));

describe('app.json plugin contract', () => {
  it('lists exactly these plugins, in this order', () => {
    // Frozen deliberately. A legitimate plugin change updates this array in the
    // same commit — which is the point: it makes the change deliberate instead
    // of something `expo install --fix` did on the way past.
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
    // CLAUDE.md § Expo Dev Client. Listing it buys nothing (its plugin is a
    // no-op with no options) and `expo install --fix` keeps re-adding it.
    expect(expo.plugins.map(pluginName)).not.toContain('@react-native-community/datetimepicker');
  });

  it('points the four icon and splash surfaces at the committed assets', () => {
    expect(expo.icon).toBe('./assets/icon.png');
    expect(expo.ios.icon).toBe('./assets/icon.png');
    expect(expo.android.adaptiveIcon.foregroundImage).toBe('./assets/adaptive-icon.png');
    expect(expo.android.adaptiveIcon.backgroundColor).toBe('#0F1923');
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
    // Derivation, so the bound is not folklore: expo-splash-screen composites the
    // image into a centred imageWidth-dp box on a 288dp canvas
    // (withAndroidSplashImages.js:100-124) and sets no
    // windowSplashScreenIconBackgroundColor, which puts the icon on Android's
    // "without icon background" spec — a 192dp visible circle, radius 96dp.
    // A centred square of side w has half-diagonal w*sqrt(2)/2, so the corners
    // clip past w = 2*96/sqrt(2) = 135.76dp. Expo's own default of 200 clips.
    expect(splash[1].imageWidth as number).toBeLessThanOrEqual(135);
  });
});
