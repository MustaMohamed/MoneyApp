import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text as HeroText } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, Size, Type } from '@/constants/theme';

export function UnassignedSpendingRow({ amountLabel }: { amountLabel: string }) {
  return (
    <View className="border-separator bg-default/30 min-h-11 flex-row items-center gap-2 border-b px-4 py-1.5">
      <View className="items-center" style={{ width: Size.budgetCategoryColumn }}>
        <View className="border-border bg-default h-8 w-8 items-center justify-center rounded-full border">
          <MaterialCommunityIcons name="link-off" size={Size.iconXs} color={Colors.dark.text2} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <HeroText
          style={{ fontSize: Type.micro }}
          className="font-inter text-foreground font-semibold"
        >
          {Strings.budgetCategoriesUnassignedSpending}
        </HeroText>
        <HeroText style={{ fontSize: Type.chip }} className="font-inter text-muted">
          {Strings.budgetCategoriesUnassignedExplanation}
        </HeroText>
      </View>
      <HeroText
        style={{ fontSize: Type.micro }}
        className="font-sora text-foreground font-semibold"
      >
        {amountLabel}
      </HeroText>
    </View>
  );
}
