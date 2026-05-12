import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Strings } from '@/constants/strings';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';
import { useAbout } from './about.hook';

export default function AboutScreen() {
  const { state } = useAbout();

  return (
    <Screen edges={['bottom']}>
      <ScreenScroll contentContainerStyle={{ paddingBottom: 48 }}>
        {/* App info card */}
        <View className="mx-4 mt-6 bg-surface rounded-2xl p-6 border border-border items-center">
          {/* App icon placeholder — replace with Image when asset exists */}
          <View className="w-20 h-20 rounded-2xl bg-default border border-border items-center justify-center mb-4">
            <MaterialCommunityIcons name="chart-line" size={40} color={Colors.shared.cairoGold} />
          </View>

          <Text className="text-foreground font-sora-bold text-xl mb-1">MoneyApp</Text>

          <Text className="text-muted font-inter-regular text-sm">
            {Strings.aboutVersion(state.version)}
          </Text>
          <Text className="text-muted font-inter-regular text-sm mt-0.5">
            {Strings.aboutBuild(state.build)}
          </Text>
        </View>

        {/* Data locality notice */}
        <View className="mx-4 mt-4 bg-surface rounded-xl px-4 py-4 border border-border">
          <Text className="text-muted font-inter-regular text-sm text-center leading-5">
            {Strings.aboutDataNotice}
          </Text>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
