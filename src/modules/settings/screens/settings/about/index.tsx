import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';

import { useAbout } from './about.hook';

export default function AboutScreen() {
  const { state } = useAbout();

  return (
    <Screen edges={['bottom']}>
      <ScreenScroll contentContainerStyle={{ paddingBottom: 48 }}>
        {/* App info card */}
        <View className="bg-surface border-border mx-4 mt-6 items-center rounded-2xl border p-6">
          {/* App icon placeholder — replace with Image when asset exists */}
          <View className="bg-default border-border mb-4 h-20 w-20 items-center justify-center rounded-2xl border">
            <MaterialCommunityIcons name="chart-line" size={40} color={Colors.shared.cairoGold} />
          </View>

          <Text className="text-foreground font-sora-bold mb-1 text-xl">MoneyApp</Text>

          <Text className="text-muted font-inter text-sm">
            {Strings.aboutVersion(state.version)}
          </Text>
          <Text className="text-muted font-inter mt-0.5 text-sm">
            {Strings.aboutBuild(state.build)}
          </Text>
        </View>

        {/* Data locality notice */}
        <View className="bg-surface border-border mx-4 mt-4 rounded-xl border px-4 py-4">
          <Text className="text-muted font-inter text-center text-sm leading-5">
            {Strings.aboutDataNotice}
          </Text>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
