/**
 * SaveCta — the primary action button for the Add / Edit Transaction sheets.
 *
 * Renders as the BARE Pressable. The Sheet wrapper at components/ui/sheet.tsx
 * already provides the footer chrome (border-top hairline + horizontal padding
 * + bottom safe-area padding) via its BottomSheetFooter slot styling, so we
 * deliberately do NOT wrap this in another padded/bordered View. Doing so
 * stacked two hairlines + double bottom padding (~44px), producing the
 * "two separators + big bottom space" symptom reported during QA.
 */
import { ActivityIndicator, Pressable } from 'react-native';

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
    <Pressable
      testID="save-cta"
      onPress={saving ? undefined : onPress}
      disabled={saving}
      className="h-[52px] items-center justify-center rounded-[13px]"
      style={{ backgroundColor: GoldTokens[500] }}
    >
      {saving ? (
        <ActivityIndicator testID="save-cta-spinner" color={Colors.shared.midnightBlue} />
      ) : (
        <Text
          className="font-sora text-[15px] font-bold"
          style={{ color: Colors.shared.midnightBlue }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
