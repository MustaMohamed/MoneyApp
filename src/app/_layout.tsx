import '../../global.css';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
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
          {/* HeroUINativeProviderRaw omits the PortalHost; HeroUI BottomSheet
              (and any portal-based overlay) renders into this host. */}
          <PortalHost />
        </HeroUINativeProviderRaw>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
