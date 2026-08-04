import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

interface Props {
  onAddAccount: () => void;
}

export function NoAccountsEmpty({ onAddAccount }: Props): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6 py-8">
      <MaterialCommunityIcons name="bank-off" size={Size.emptyStateIcon} color={CoreTokens.text2} />
      <Text
        className="font-sora-semibold text-foreground text-center"
        style={{ fontSize: Type.emptyTitle }}
      >
        {Strings.addTxNoAccountsTitle}
      </Text>
      <Text className="font-inter text-muted text-center" style={{ fontSize: Type.meta }}>
        {Strings.addTxNoAccountsBody}
      </Text>
      <Button
        testID="no-accounts-cta"
        onPress={onAddAccount}
        variant="primary"
        label={Strings.addTxNoAccountsCta}
      />
    </View>
  );
}
