import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { HeaderIconAction } from '@/components/ui/header_icon_action';
import { NATIVE_HEADER_BACK_PADDING } from '@/components/ui/stack_header.geometry';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

export interface BackButtonProps {
  onPress: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  return (
    <HeaderIconAction
      edge="leading"
      icon="chevron-left"
      iconSize={Size.iconBack}
      iconColor={CoreTokens.text2}
      accessibilityLabel={Strings.goBackAccessibility}
      onPress={onPress}
    />
  );
}

// The native header clips its left item at the item's edge, so this padding is the back button's tap band.
export function NativeHeaderBackButton() {
  const router = useRouter();
  return (
    <View style={NATIVE_HEADER_BACK_PADDING}>
      <BackButton onPress={() => router.back()} />
    </View>
  );
}
