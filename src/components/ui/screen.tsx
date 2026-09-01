import { cn } from 'heroui-native';
import React from 'react';
import {
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { type Edge, type EdgeRecord, useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ScreenProps extends Omit<ViewProps, 'style'> {
  className?: string;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[] | EdgeRecord;
}

const DEFAULT_EDGES: Edge[] = ['top', 'bottom'];

function hasEdge(edges: ScreenProps['edges'], edge: Edge) {
  const resolvedEdges = edges ?? DEFAULT_EDGES;
  if (Array.isArray(resolvedEdges)) return resolvedEdges.includes(edge);
  return resolvedEdges[edge] !== undefined && resolvedEdges[edge] !== 'off';
}

export function Screen({
  className,
  style,
  edges = DEFAULT_EDGES,
  children,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          flex: 1,
          paddingTop: hasEdge(edges, 'top') ? insets.top : 0,
          paddingBottom: hasEdge(edges, 'bottom') ? insets.bottom : 0,
          paddingLeft: hasEdge(edges, 'left') ? insets.left : 0,
          paddingRight: hasEdge(edges, 'right') ? insets.right : 0,
        },
        style,
      ]}
      className={cn('bg-background', className)}
      {...props}
    >
      {children}
    </View>
  );
}

export interface ScreenScrollProps extends ScrollViewProps {
  className?: string;
}

// A `flex-1` className does not hold the flex chain, so `flex` and `flexGrow` go in `style`.
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
