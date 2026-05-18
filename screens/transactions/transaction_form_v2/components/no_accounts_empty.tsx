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
    <View className="flex-1 items-center justify-center px-6 py-8 gap-4">
      <MaterialCommunityIcons name="bank-off" size={56} color={CoreTokens.text2} />
      <Text className="font-sora font-semibold text-[17px] text-foreground text-center">
        {Strings.addTxNoAccountsTitle}
      </Text>
      <Text className="font-inter text-[13px] text-muted text-center">
        {Strings.addTxNoAccountsBody}
      </Text>
      <Button testID="no-accounts-cta" onPress={onAddAccount} variant="primary">
        <Text className="font-sora font-semibold text-[15px]">{Strings.addTxNoAccountsCta}</Text>
      </Button>
    </View>
  );
}
