import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { initDatabase } from '@/db/init';
import { loadOnboardingState } from '@/store/onboardingStore';

SplashScreen.preventAutoHideAsync();

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

  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await loadOnboardingState();
      } catch {
        // DB or SecureStore failure — surface splash and let the app render
        // in a degraded state rather than hanging forever on a blank screen.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded && ready) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F1923' },
        }}
      />
    </>
  );
}
