import { Stack } from 'expo-router';

import { Colors, FontFamily, Type } from '@/constants/theme';
import { Strings } from '@/constants/strings';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.dark.bg },
        headerTintColor: Colors.dark.text1,
        headerTitleStyle: { fontFamily: FontFamily.soraSemi, fontSize: Type.subhead },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.dark.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: Strings.settingsTitle }} />
      <Stack.Screen name="currency/index" options={{ title: Strings.currencyScreenTitle }} />
      <Stack.Screen name="categories/index" options={{ title: Strings.categoriesTitle }} />
      <Stack.Screen name="about/index" options={{ title: Strings.aboutTitle }} />
    </Stack>
  );
}
