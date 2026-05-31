import { cn } from 'heroui-native';
import React from 'react';
import { ScrollView, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

export interface ScreenProps extends Omit<SafeAreaViewProps, 'style'> {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

// SafeAreaView from react-native-safe-area-context is a wrapper that doesn't
// reliably propagate Uniwind's `flex-1` className through to its inner View
// on Android Fabric. Bake `flex: 1` into the style prop here so every screen
// gets a working flex chain root.
export function Screen({
  className,
  style,
  edges = ['top', 'bottom'],
  children,
  ...props
}: ScreenProps) {
  return (
    <SafeAreaView
      style={[{ flex: 1 }, style]}
      className={cn('bg-background', className)}
      edges={edges}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}

export interface ScreenScrollProps extends ScrollViewProps {
  className?: string;
}

// ScrollView with flex: 1 + flexGrow on the content container baked in.
// Same rationale as Screen — keeps the flex chain unbroken without relying
// on className=flex-1 working on a wrapper.
export function ScreenScroll({
  className,
  contentContainerStyle,
  style,
  children,
  ...props
}: ScreenScrollProps) {
  return (
    <ScrollView
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
      className={className}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
