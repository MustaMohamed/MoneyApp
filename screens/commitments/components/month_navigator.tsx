import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CoreTokens } from '@/constants/theme_tokens';
import { formatMonthYear } from '@/utils/format_date';

interface MonthNavigatorProps {
  yearMonth: string; // 'YYYY-MM'
  onPrev: () => void;
  onNext: () => void;
}

export function MonthNavigator({ yearMonth, onPrev, onNext }: MonthNavigatorProps) {
  const label = formatMonthYear(yearMonth);
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
      className="py-2"
    >
      <Pressable
        onPress={onPrev}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        className="p-1"
      >
        <MaterialCommunityIcons name="chevron-left" size={24} color={CoreTokens.text1} />
      </Pressable>
      <Text className="font-sora text-foreground min-w-[120px] text-center text-[17px] font-semibold">
        {label}
      </Text>
      <Pressable
        onPress={onNext}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Next month"
        className="p-1"
      >
        <MaterialCommunityIcons name="chevron-right" size={24} color={CoreTokens.text1} />
      </Pressable>
    </View>
  );
}
