import React from 'react';
import { View, Pressable, Text } from 'react-native';

/** Minimal mock for heroui-native — satisfies Sheet tests. */

export const cn = (...args: (string | undefined | null | false)[]) =>
  args.filter(Boolean).join(' ');

export function useBottomSheetAwareHandlers() {
  return { onFocus: jest.fn(), onBlur: jest.fn() };
}

function BottomSheetRoot({
  children,
  isOpen,
  onOpenChange: _onOpenChange,
}: {
  children?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  if (!isOpen) return null;
  return <View testID="heroui-bottom-sheet">{children}</View>;
}

function Portal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function Overlay({ isCloseOnPress, onPress }: { isCloseOnPress?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      testID="heroui-bottom-sheet-overlay"
      onPress={isCloseOnPress !== false ? onPress : undefined}
    />
  );
}

function Content({ children }: { children?: React.ReactNode }) {
  return <View testID="heroui-bottom-sheet-content">{children}</View>;
}

function Close({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable testID="heroui-bottom-sheet-close" onPress={onPress} accessibilityLabel="Close" />
  );
}

function Title({ children }: { children?: React.ReactNode }) {
  return <Text testID="heroui-bottom-sheet-title">{children}</Text>;
}

function Description({ children }: { children?: React.ReactNode }) {
  return <Text testID="heroui-bottom-sheet-description">{children}</Text>;
}

function Trigger({ children, asChild }: { children?: React.ReactNode; asChild?: boolean }) {
  if (asChild) return <>{children}</>;
  return <View>{children}</View>;
}

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Portal,
  Overlay,
  Content,
  Close,
  Title,
  Description,
  Trigger,
});
