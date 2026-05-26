import React from 'react';
import { View, type ViewProps } from 'react-native';

/**
 * Jest mock for @gorhom/bottom-sheet.
 *
 * - BottomSheet: tracks open/closed state internally via useState.
 *   `index` prop is initial-only (mirrors real v5 behaviour).
 *   Imperative `snapToIndex(n)` / `close()` drive the open state AND
 *   record calls on the stable `bottomSheetMockMethods` spy handles
 *   so tests can assert them without needing access to the internal ref.
 * - BottomSheetView: passthrough View wrapper.
 * - BottomSheetScrollView: passthrough ScrollView wrapper.
 * - BottomSheetFlatList: passthrough FlatList wrapper.
 * - BottomSheetBackdrop: renders a pressable View with testID="bottom-sheet-backdrop".
 * - BottomSheetFooter: passthrough View wrapper for sticky footer content.
 */

interface BottomSheetProps {
  index: number;
  snapPoints: string[];
  enablePanDownToClose?: boolean;
  onClose?: () => void;
  backdropComponent?: React.ComponentType<any>;
  handleComponent?: React.ComponentType<any>;
  footerComponent?: React.ComponentType<any>;
  children?: React.ReactNode;
  style?: ViewProps['style'];
  backgroundStyle?: ViewProps['style'];
}

export interface BottomSheetMockRef {
  close: jest.Mock;
  snapToIndex: jest.Mock;
}

/**
 * Stable spy handles — allocated once per test file load.
 * Tests clear them in beforeEach and assert directly:
 *
 *   import { bottomSheetMockMethods } from '@gorhom/bottom-sheet';
 *   bottomSheetMockMethods.close.mockClear();
 *   expect(bottomSheetMockMethods.close).toHaveBeenCalledTimes(1);
 */
export const bottomSheetMockMethods: BottomSheetMockRef = {
  close: jest.fn(),
  snapToIndex: jest.fn(),
};

const BottomSheet = React.forwardRef<BottomSheetMockRef, BottomSheetProps>(
  (
    {
      index: initialIndex,
      children,
      onClose: _onClose,
      backdropComponent: BackdropComponent,
      handleComponent: HandleComponent,
      footerComponent: FooterComponent,
    },
    ref,
  ) => {
    // Track open/closed state internally.
    // `initialIndex` is the initial value only — imperative methods drive state.
    const [isOpen, setIsOpen] = React.useState(initialIndex >= 0);
    // Stable ref so useImperativeHandle doesn't recreate functions every render.
    const setOpenRef = React.useRef(setIsOpen);
    setOpenRef.current = setIsOpen;

    React.useImperativeHandle(
      ref,
      () => ({
        close: jest.fn().mockImplementation(() => {
          bottomSheetMockMethods.close();
          setOpenRef.current(false);
        }),
        snapToIndex: jest.fn().mockImplementation((n: number) => {
          bottomSheetMockMethods.snapToIndex(n);
          setOpenRef.current(true);
        }),
      }),
      [],
    );

    if (!isOpen) return null;
    return (
      <View testID="bottom-sheet">
        {BackdropComponent && (
          <BackdropComponent
            animatedIndex={{ value: initialIndex }}
            animatedPosition={{ value: 0 }}
          />
        )}
        {HandleComponent && <HandleComponent />}
        {children}
        {FooterComponent && <FooterComponent animatedFooterPosition={{ value: 0 }} />}
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

function BottomSheetView({ children, ...props }: ViewProps & { children?: React.ReactNode }) {
  return (
    <View testID="bottom-sheet-view" {...props}>
      {children}
    </View>
  );
}

function BottomSheetFooter({ children }: { children?: React.ReactNode }) {
  return <View>{children}</View>;
}

function BottomSheetTextInput(props: any) {
  const { TextInput } = require('react-native');
  return <TextInput {...props} />;
}

export default BottomSheet;
export {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
};
