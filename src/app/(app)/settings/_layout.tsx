import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';

// NativeStack has no `headerLeftContainerStyle`, so the header inset is applied by this wrapper.
function SettingsBackButton() {
  const router = useRouter();
  return (
    <View style={{ paddingLeft: 0, paddingRight: Spacing.xs }}>
      <BackButton onPress={() => router.back()} />
    </View>
  );
}

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
        options={{ title: Strings.settingsTitle, headerLeft: () => <SettingsBackButton /> }}
      />
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
