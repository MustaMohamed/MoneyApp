import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

// The array makes `flatten` return an object for a bar with no `style`, so its height reads `undefined`.
export function barHeight(bar: { props: { style?: StyleProp<ViewStyle> } }): ViewStyle['height'] {
  return StyleSheet.flatten([bar.props.style]).height;
}
