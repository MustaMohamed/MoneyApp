import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';

interface Props {
  saving: boolean;
  onPress: () => void;
  label: string;
}

export function SaveCta({ saving, onPress, label }: Props): React.ReactElement {
  return (
    <View className="border-t border-separator pt-2 px-4 pb-6">
      <Pressable
        testID="save-cta"
        onPress={saving ? undefined : onPress}
        disabled={saving}
        className="h-[52px] rounded-[13px] items-center justify-center"
        style={{ backgroundColor: GoldTokens[500] }}
      >
        {saving ? (
          <ActivityIndicator testID="save-cta-spinner" color={Colors.shared.midnightBlue} />
        ) : (
          <Text
            className="font-sora font-bold text-[15px]"
            style={{ color: Colors.shared.midnightBlue }}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
