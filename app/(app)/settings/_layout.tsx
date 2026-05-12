import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Colors, FontFamily, Size, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { Strings } from '@/constants/strings';

function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={ms(8)}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={{ width: Size.backBtn, height: Size.backBtn, alignItems: 'center', justifyContent: 'center' }}
    >
      <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color={Colors.dark.text1} />
    </Pressable>
  );
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
        options={{ title: Strings.currencyScreenTitle, headerLeft: () => <BackButton /> }}
      />
      <Stack.Screen
        name="categories/index"
        options={{ title: Strings.categoriesTitle, headerLeft: () => <BackButton /> }}
      />
      <Stack.Screen
        name="about/index"
        options={{ title: Strings.aboutTitle, headerLeft: () => <BackButton /> }}
      />
    </Stack>
  );
}
