import { Separator, Surface, Text as HeroText } from 'heroui-native';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { Screen } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';

export default function GoalsScreen() {
  return (
    <Screen>
      <Surface variant="transparent" className="rounded-none px-4 py-0 shadow-none">
        <View style={{ minHeight: Size.headerHeight, justifyContent: 'center' }}>
          <HeroText.Heading type="h3" weight="bold" truncate className="font-sora">
            {Strings.goalsTitle}
          </HeroText.Heading>
        </View>
      </Surface>
      <Separator />
      <EmptyState variant="goals" />
    </Screen>
  );
}
