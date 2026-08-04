import { cn } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Text } from '@/components/ui/text';

interface CommitmentHeaderProps {
  title: string;
  /** When provided, renders a BackButton + centered title; otherwise a left-aligned title. */
  onBack?: () => void;
  /** Right-slot content (e.g. an Edit action). Falls back to a 44px spacer when `onBack` is set. */
  right?: React.ReactNode;
  /** Centered title size: large = 20px (default), false = 17px. Ignored when no `onBack`. */
  large?: boolean;
}

export function CommitmentHeader({ title, onBack, right, large = true }: CommitmentHeaderProps) {
  if (!onBack) {
    return (
      <View className="border-separator h-14 justify-center border-b px-4">
        <Text className="font-sora-semibold text-foreground text-[20px]">{title}</Text>
      </View>
    );
  }

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center' }}
      className="border-separator h-14 justify-between border-b px-2"
    >
      <BackButton onPress={onBack} />
      <Text
        className={cn(
          'font-sora-semibold text-foreground flex-1 text-center',
          large ? 'text-[20px]' : 'text-[17px]',
        )}
        numberOfLines={large ? 1 : undefined}
      >
        {title}
      </Text>
      {right ?? <View className="min-w-[44px]" />}
    </View>
  );
}
