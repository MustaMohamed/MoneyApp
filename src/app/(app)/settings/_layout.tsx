import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';

/**
 * SettingsBackButton — wraps BackButton in a padded View so the boxy button
 * gets breathing room from the screen left edge (paddingLeft) and from the
 * title text (paddingRight). NativeStack does not expose headerLeftContainerStyle,
 * so we apply the inset here instead.
 */
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
