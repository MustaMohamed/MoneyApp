import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Button } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';

interface Props {
  onAddAccount: () => void;
}

export function NoAccountsEmpty({ onAddAccount }: Props): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6 py-8">
      <MaterialCommunityIcons name="bank-off" size={56} color={CoreTokens.text2} />
      <Text className="font-sora text-foreground text-center text-[17px] font-semibold">
        {Strings.addTxNoAccountsTitle}
      </Text>
      <Text className="font-inter text-muted text-center text-[13px]">
        {Strings.addTxNoAccountsBody}
      </Text>
      <Button testID="no-accounts-cta" onPress={onAddAccount} variant="primary">
        <Text className="font-sora text-[15px] font-semibold">{Strings.addTxNoAccountsCta}</Text>
      </Button>
    </View>
  );
}
