import { useRouter } from 'expo-router';
import { Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { resolveStackHeaderGeometry } from '@/components/ui/stack_header.geometry';
import { Size } from '@/constants/theme';

export interface StackHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function StackHeader({ title, onBack, right }: StackHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  const { fontScale } = useWindowDimensions();
  const geometry = resolveStackHeaderGeometry(fontScale);

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', height: geometry.height }}
      className="border-separator justify-between border-b px-2"
    >
      <BackButton onPress={handleBack} />
      <Typography
        className="font-sora-semibold text-foreground flex-1 text-center"
        allowFontScaling={false}
        style={geometry.title}
        numberOfLines={1}
      >
        {title}
      </Typography>
      {right ?? <View style={{ width: Size.headerActionTrack }} />}
    </View>
  );
}
