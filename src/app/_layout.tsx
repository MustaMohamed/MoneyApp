import '../../global.css';
// Import per face: the package root re-exports every weight, bundling ~26 .ttf files to use 8.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Sora_400Regular } from '@expo-google-fonts/sora/400Regular';
import { Sora_600SemiBold } from '@expo-google-fonts/sora/600SemiBold';
import { Sora_700Bold } from '@expo-google-fonts/sora/700Bold';
import { Sora_800ExtraBold } from '@expo-google-fonts/sora/800ExtraBold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { PortalHost } from 'heroui-native/portal';
import { HeroUINativeProviderRaw } from 'heroui-native/provider-raw';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { enableFreeze } from 'react-native-screens';

import { Colors } from '@/constants/theme';
import { StartupError } from '@/modules/navigation/components/startup_error';
import { useAppInit } from '@/utils/use_layout_init.hook';

void SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(Colors.dark.bg);
enableFreeze(true);

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.bg,
    card: Colors.dark.surface,
    border: Colors.dark.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  const {
    state: { status, error },
    retry,
  } = useAppInit();

  useEffect(() => {
    if (fontsLoaded && status !== 'initializing') {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, status]);

  if (!fontsLoaded) return null;

  const showStartupError = status === 'fatalError' || (status === 'initializing' && error !== null);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.dark.bg }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <HeroUINativeProviderRaw>
          <ThemeProvider value={AppTheme}>
            <StatusBar style="light" />
            {showStartupError ? (
              <StartupError isRetrying={status === 'initializing'} onRetry={retry} />
            ) : status === 'ready' ? (
              <Stack
                screenOptions={{
                  headerShown: false,
                  freezeOnBlur: true,
                  contentStyle: { backgroundColor: Colors.dark.bg },
                }}
              />
            ) : null}
          </ThemeProvider>
          {/* `HeroUINativeProviderRaw` omits the `PortalHost`; portal overlays render here. */}
          <PortalHost />
        </HeroUINativeProviderRaw>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
