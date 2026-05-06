import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
import { useEffect } from 'react';

import { useShallow } from 'zustand/react/shallow';

import { useReadyStore } from '@/store/ready.store';
import { useLayoutInit } from '@/utils/use_layout_init.hook';

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

  const { state: readyState } = useReadyStore(useShallow((s) => ({ state: s.state })));
  useLayoutInit();

  useEffect(() => {
    if (fontsLoaded && readyState.ready) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, readyState.ready]);

  if (!fontsLoaded || !readyState.ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F1923' },
        }}
      />
    </GestureHandlerRootView>
  );
}
