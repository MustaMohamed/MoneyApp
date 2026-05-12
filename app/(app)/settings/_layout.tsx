import { Stack, useRouter } from 'expo-router';

import { Colors, FontFamily, Type } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { BackButton } from '@/components/ui/back_button';

function SettingsBackButton() {
  const router = useRouter();
  return <BackButton onPress={() => router.back()} />;
}

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
      <Stack.Screen
        name="currency/index"
        options={{ title: Strings.currencyScreenTitle, headerLeft: () => <SettingsBackButton /> }}
      />
      <Stack.Screen
        name="categories/index"
        options={{ title: Strings.categoriesTitle, headerLeft: () => <SettingsBackButton /> }}
      />
      <Stack.Screen
        name="about/index"
        options={{ title: Strings.aboutTitle, headerLeft: () => <SettingsBackButton /> }}
      />
    </Stack>
  );
}
