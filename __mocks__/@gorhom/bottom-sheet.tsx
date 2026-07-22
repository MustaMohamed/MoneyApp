import type {
  BottomSheetBackdropProps,
  BottomSheetFooterProps,
  BottomSheetProps as GorhomBottomSheetProps,
} from '@gorhom/bottom-sheet';
import React from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type FlatListProps,
  type ScrollViewProps,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

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

type BottomSheetProps = Pick<
  GorhomBottomSheetProps,
  | 'index'
  | 'snapPoints'
  | 'enablePanDownToClose'
  | 'onClose'
  | 'backdropComponent'
  | 'handleComponent'
  | 'footerComponent'
  | 'children'
  | 'style'
  | 'backgroundStyle'
>;

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

function createSharedValue(value: number): SharedValue<number> {
  const shared: SharedValue<number> = {
    value,
    get: () => shared.value,
    set: (next) => {
      shared.value = typeof next === 'function' ? next(shared.value) : next;
    },
    addListener: () => {},
    removeListener: () => {},
    modify: (modifier) => {
      if (modifier) shared.value = modifier(shared.value);
    },
  };
  return shared;
}

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
    const numericInitialIndex = initialIndex ?? -1;
    const [isOpen, setIsOpen] = React.useState(numericInitialIndex >= 0);
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
    const animatedIndex = createSharedValue(numericInitialIndex);
    const animatedPosition = createSharedValue(0);
    return (
      <View testID="bottom-sheet">
        {BackdropComponent && (
          <BackdropComponent animatedIndex={animatedIndex} animatedPosition={animatedPosition} />
        )}
        {HandleComponent && (
          <HandleComponent animatedIndex={animatedIndex} animatedPosition={animatedPosition} />
        )}
        {children}
        {FooterComponent && <FooterComponent animatedFooterPosition={animatedPosition} />}
      </View>
    );
  },
);
BottomSheet.displayName = 'BottomSheet';

interface MockBottomSheetBackdropProps extends BottomSheetBackdropProps {
  appearsOnIndex?: number;
  disappearsOnIndex?: number;
  opacity?: number;
  onPress?: () => void;
}

function BottomSheetBackdrop({ onPress }: MockBottomSheetBackdropProps) {
  return (
    <Pressable
      testID="bottom-sheet-backdrop"
      onPress={onPress}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

function BottomSheetScrollView({ children, ...props }: ScrollViewProps) {
  return <ScrollView {...props}>{children}</ScrollView>;
}

function BottomSheetFlatList<ItemT>(props: FlatListProps<ItemT>) {
  return <FlatList {...props} />;
}

function BottomSheetView({ children, ...props }: ViewProps & { children?: React.ReactNode }) {
  return (
    <View testID="bottom-sheet-view" {...props}>
      {children}
    </View>
  );
}

function BottomSheetFooter({ children }: BottomSheetFooterProps & { children?: React.ReactNode }) {
  return <View>{children}</View>;
}

function BottomSheetTextInput(props: TextInputProps) {
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
