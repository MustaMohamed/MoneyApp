import { Stack } from 'expo-router';

import { NativeHeaderBackButton } from '@/components/ui/back_button';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Type } from '@/constants/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        freezeOnBlur: true,
        headerStyle: { backgroundColor: Colors.dark.bg },
        headerTintColor: Colors.dark.text1,
        headerTitleStyle: { fontFamily: FontFamily.soraSemi, fontSize: Type.subhead },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.dark.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: Strings.settingsTitle, headerLeft: () => <NativeHeaderBackButton /> }}
      />
      <Stack.Screen
        name="currency/index"
        options={{
          title: Strings.currencyScreenTitle,
          headerLeft: () => <NativeHeaderBackButton />,
        }}
      />
      <Stack.Screen
        name="categories/index"
        options={{ title: Strings.categoriesTitle, headerLeft: () => <NativeHeaderBackButton /> }}
      />
      <Stack.Screen
        name="about/index"
        options={{ title: Strings.aboutTitle, headerLeft: () => <NativeHeaderBackButton /> }}
      />
    </Stack>
  );
}
