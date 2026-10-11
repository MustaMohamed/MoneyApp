import { cn } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Text } from '@/components/ui/text';
import { resolveOneLineTextProps } from '@/components/ui/text_scale.geometry';

import { resolveCommitmentHeaderGeometry } from './commitment_header.geometry';

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
  const { fontScale } = useWindowDimensions();
  const geometry = resolveCommitmentHeaderGeometry(fontScale, !onBack || large);
  const titleLine = resolveOneLineTextProps(geometry.title);

  if (!onBack) {
    return (
      <View
        className="border-separator justify-center border-b px-4"
        style={{ height: geometry.height }}
      >
        <Text className="font-sora-semibold text-foreground text-[20px]" {...titleLine}>
          {title}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', height: geometry.height }}
      className="border-separator justify-between border-b px-2"
    >
      <BackButton onPress={onBack} />
      <Text
        className={cn(
          'font-sora-semibold text-foreground flex-1 text-center',
          large ? 'text-[20px]' : 'text-[17px]',
        )}
        {...titleLine}
      >
        {title}
      </Text>
      {right ?? <View className="min-w-[44px]" />}
    </View>
  );
}
