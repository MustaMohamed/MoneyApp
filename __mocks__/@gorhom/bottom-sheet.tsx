import React from 'react';
import { View, type ViewProps } from 'react-native';

/**
 * Jest mock for @gorhom/bottom-sheet.
 *
 * - BottomSheet: renders children when index >= 0; calls onClose on backdrop press.
 * - BottomSheetScrollView: passthrough ScrollView wrapper.
 * - BottomSheetFlatList: passthrough FlatList wrapper.
 * - BottomSheetBackdrop: renders a pressable View with testID="bottom-sheet-backdrop".
 */

interface BottomSheetProps {
  index: number;
  snapPoints: string[];
  enablePanDownToClose?: boolean;
  onClose?: () => void;
  backdropComponent?: React.ComponentType<any>;
  handleComponent?: React.ComponentType<any>;
  children?: React.ReactNode;
  style?: ViewProps['style'];
  backgroundStyle?: ViewProps['style'];
}

const BottomSheet = React.forwardRef<any, BottomSheetProps>(
  (
    {
      index,
      children,
      onClose,
      backdropComponent: BackdropComponent,
      handleComponent: HandleComponent,
    },
    _ref,
  ) => {
    if (index < 0) return null;
    return (
      <View testID="bottom-sheet">
        {BackdropComponent && (
          <BackdropComponent animatedIndex={{ value: index }} animatedPosition={{ value: 0 }} />
        )}
        {HandleComponent && <HandleComponent />}
        {children}
      </View>
    );
  },
);
BottomSheet.displayName = 'BottomSheet';

interface BottomSheetBackdropProps {
  animatedIndex: { value: number };
  animatedPosition: { value: number };
  appearsOnIndex?: number;
  disappearsOnIndex?: number;
  opacity?: number;
  onPress?: () => void;
}

function BottomSheetBackdrop({ onPress }: BottomSheetBackdropProps) {
  const { Pressable } = require('react-native');
  return (
    <Pressable
      testID="bottom-sheet-backdrop"
      onPress={onPress}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

function BottomSheetScrollView({ children, ...props }: any) {
  const { ScrollView } = require('react-native');
  return <ScrollView {...props}>{children}</ScrollView>;
}

function BottomSheetFlatList(props: any) {
  const { FlatList } = require('react-native');
  return <FlatList {...props} />;
}

export default BottomSheet;
export { BottomSheet, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetFlatList };
