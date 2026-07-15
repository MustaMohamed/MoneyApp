import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text as HeroText } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export function UnassignedSpendingRow({ amountLabel }: { amountLabel: string }) {
  return (
    <View className="border-separator bg-warning/5 min-h-11 flex-row items-center gap-2 border-b px-4 py-1.5">
      <View className="w-[46px] items-center">
        <View className="border-warning/40 bg-warning/10 h-8 w-8 items-center justify-center rounded-full border">
          <MaterialCommunityIcons name="link-off" size={ms(15)} color={Colors.dark.warning} />
        </View>
      </View>
      <HeroText className="font-inter text-warning flex-1 text-[11px] font-semibold">
        {Strings.budgetCategoriesUnassignedSpending}
      </HeroText>
      <HeroText className="font-sora text-warning text-[10px] font-semibold">
        {amountLabel}
      </HeroText>
    </View>
  );
}
