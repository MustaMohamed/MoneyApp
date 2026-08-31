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

/** Spies allocated once per test file load; clear them in `beforeEach`. */
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
    // `index` is initial-only, as in real v5; imperative methods drive the open state.
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
