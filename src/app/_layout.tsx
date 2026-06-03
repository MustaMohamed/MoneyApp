import '../../global.css';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import { useSignals } from '@preact/signals-react/runtime';
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

import { Colors } from '@/constants/theme';
import { useAppInit } from '@/utils/use_layout_init.hook';

void SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(Colors.dark.bg);

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
  useSignals();
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
    state: { ready },
  } = useAppInit();

  useEffect(() => {
    if (fontsLoaded && ready) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.dark.bg }}>
      <HeroUINativeProviderRaw>
        <ThemeProvider value={AppTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.dark.bg },
            }}
          />
        </ThemeProvider>
        {/* HeroUINativeProviderRaw omits the PortalHost; HeroUI BottomSheet
            (and any portal-based overlay) renders into this host. */}
        <PortalHost />
      </HeroUINativeProviderRaw>
    </GestureHandlerRootView>
  );
}
