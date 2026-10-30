// Scrollable content in a Sheet must use `BottomSheetScrollView`; RN `ScrollView` will not scroll.
import { BottomSheetFooter, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { BottomSheet } from 'heroui-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSheetVisibilityStore } from '@/components/ui/sheet_visibility.state';
import {
  Colors,
  FontFamily,
  HIT_SLOP_UNCLIPPED_STYLE,
  Size,
  Spacing,
  Type,
  lineHeightFor,
} from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { PressHighlight } from './press_highlight';
import {
  SHEET_HEADER_PADDING_BOTTOM,
  type FocusedInput,
  type SheetSize,
  type SnapPoint,
  resolveKeyboardProps,
  resolveSheetCloseGestureProps,
  resolveSheetClosedAtRestProps,
  resolveSheetContentPadding,
  resolveSnapPoints,
  shouldBlurInputOnClose,
} from './sheet.helpers';
import { useSheetCloseHitSlop, useSheetCloseLifecycle } from './sheet.hook';

// Keyboard inputs: wire this onto an `Input`'s `onFocus`/`onBlur` inside a sheet.
export { useBottomSheetAwareHandlers } from 'heroui-native';

export interface SheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a previously open sheet settles at its closed index. */
  onCloseComplete?: () => void;
  /** Called once per open, after the sheet settles at its open index; a sheet that focuses a field as it opens focuses it here. */
  onOpenComplete?: () => void;
  title?: string;
  /** Preset height; `snapPoints` overrides it and `fitContent` ignores it. Defaults to lg. */
  size?: SheetSize;
  /** Overrides `size`; ignored when `fitContent` is true. */
  snapPoints?: SnapPoint[];
  /** Children must use gorhom's `BottomSheetScrollView`; `fitContent` wins over this. */
  scrollable?: boolean;
  /** Sizes to content height; mutually exclusive with `scrollable`, and wins over it. */
  fitContent?: boolean;
  /** Gates overlay press, pan-down, and the header close button. Defaults to true. */
  isDismissable?: boolean;
  /** Draws the header close button; overlay press and pan-down still follow `isDismissable`. Defaults to true. */
  showCloseButton?: boolean;
  /** Pass a bare CTA; the shell adds bg, hairline, and padding, so do not pad it again. */
  footer?: React.ReactNode;
  /** Android only: lift the sheet and its footer clear of the keyboard. Set it on any sheet whose `footer` must stay reachable while typing; a `scrollable` sheet with it ends its content at the footer and takes no `SHEET_FOOTER_CLEARANCE`. Assumes the activity does not resize for the IME; re-check this sheet if `app.json` gains `android.softwareKeyboardLayoutMode`. */
  liftsAboveKeyboard?: boolean;
  /** Blurs an input that took focus inside the sheet as it closes. Set it on a sheet that holds a text input and opens over a screen with a text field of its own, such as a list's search field; it brings no `adjustPan` mode, which `liftsAboveKeyboard` does. Defaults to false. */
  blursInputOnClose?: boolean;
  /** Mounts at the sheet's first open and stays through later closes. */
  children: React.ReactNode;
}

export function Sheet({
  isOpen,
  onOpenChange,
  onCloseComplete,
  onOpenComplete,
  title,
  size,
  snapPoints,
  scrollable = false,
  fitContent = false,
  isDismissable = true,
  showCloseButton = true,
  footer,
  liftsAboveKeyboard = false,
  blursInputOnClose = false,
  children,
}: SheetProps) {
  const increment = useSheetVisibilityStore((s) => s.increment);
  const decrement = useSheetVisibilityStore((s) => s.decrement);
  const insets = useSafeAreaInsets();
  // Measured, not derived: the footer's height is inset- and content-dependent, and gorhom's dynamic sizing does not fully count an absolute footer.
  const [footerHeight, setFooterHeight] = useState(0);
  const contentRef = useRef<React.ComponentRef<typeof BottomSheet.Content>>(null);
  const retryClose = useCallback(() => contentRef.current?.close(), []);
  const { closeLifecycle, handleSheetIndexChange, handleSheetClosed, handleSheetCloseRequest } =
    useSheetCloseLifecycle(isOpen, onCloseComplete, onOpenComplete, retryClose);
  const closeTouch = useSheetCloseHitSlop();
  // Plain View props, which no animated style writes: a sheet closed at rest stays hidden whatever redraws its content.
  const closedAtRestProps = resolveSheetClosedAtRestProps(closeLifecycle);
  const handleOpenChange = (open: boolean) => {
    if (!open) handleSheetCloseRequest();
    onOpenChange(open);
  };

  // FAB-hide: this primitive is the sole publisher to `sheet_visibility.state`.
  useEffect(() => {
    if (isOpen) {
      increment();
      const focusedAtOpen: FocusedInput = TextInput.State.currentlyFocusedInput();
      return () => {
        // `adjustPan` leaves the IME up after a programmatic close; the blur runs first, so a field that waits on the count reads it.
        if (
          shouldBlurInputOnClose({
            liftsAboveKeyboard,
            blursInputOnClose,
            focusedAtOpen,
            focusedNow: TextInput.State.currentlyFocusedInput(),
          })
        ) {
          Keyboard.dismiss();
        }
        decrement();
      };
    }
    return undefined;
  }, [isOpen, increment, decrement, liftsAboveKeyboard, blursInputOnClose]);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer !== undefined ? (
        <BottomSheetFooter {...props}>
          <View
            testID="sheet-footer"
            onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
            style={{
              backgroundColor: Colors.dark.surface,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: Colors.dark.border,
              paddingTop: Spacing.xs,
              paddingHorizontal: Spacing.md,
              // Lift the CTA off the bottom gesture bar; `Spacing.lg` when there is no inset.
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
            }}
          >
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [footer, insets.bottom],
  );

  // HeroUI bakes `p-5` into contentContainer and Uniwind class-merge is unreliable, so use style.
  const contentContainerProps = {
    style: resolveSheetContentPadding({
      fitContent,
      scrollable,
      hasFooter: footer !== undefined,
      liftsAboveKeyboard,
      footerHeight,
    }),
  };
  const contentSizingProps = fitContent
    ? { enableDynamicSizing: true as const, contentContainerProps }
    : {
        snapPoints: resolveSnapPoints(size, snapPoints),
        enableDynamicSizing: false as const,
        contentContainerProps,
        ...(scrollable
          ? {
              enableOverDrag: false,
              contentContainerClassName: 'h-full',
            }
          : {}),
      };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={handleOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay isCloseOnPress={isDismissable} />
        <View
          collapsable={false}
          pointerEvents={closedAtRestProps.pointerEvents}
          style={[StyleSheet.absoluteFill, { opacity: closedAtRestProps.opacity }]}
        >
          <BottomSheet.Content
            ref={contentRef}
            {...contentSizingProps}
            onChange={handleSheetIndexChange}
            onClose={handleSheetClosed}
            {...resolveKeyboardProps(liftsAboveKeyboard)}
            enablePanDownToClose={isDismissable}
            // Not `enableContentPanningGesture`: toggling it swaps the content's view type and remounts the body mid-close, blurring a focused field before the close cleanup reads it.
            {...resolveSheetCloseGestureProps(closeLifecycle)}
            backgroundClassName="bg-surface"
            handleIndicatorClassName="bg-border"
            {...(footer !== undefined ? { footerComponent: renderFooter } : {})}
          >
            {title !== undefined && (
              // No `asChild`: `CloseButton`'s animated layers crash `Slot.Pressable` and Reanimated.
              <View
                testID="sheet-header"
                onLayout={showCloseButton ? closeTouch.onHeaderLayout : undefined}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: Spacing.md,
                  paddingBottom: SHEET_HEADER_PADDING_BOTTOM,
                }}
              >
                <BottomSheet.Title
                  className="flex-1"
                  style={{
                    fontFamily: FontFamily.soraSemi,
                    fontSize: Type.subhead,
                    lineHeight: lineHeightFor(Type.subhead),
                    color: Colors.dark.text1,
                  }}
                >
                  {title}
                </BottomSheet.Title>
                {showCloseButton ? (
                  <BottomSheet.Close
                    testID="sheet-close-btn"
                    isDisabled={!isDismissable}
                    iconProps={{ size: ms(24), color: Colors.dark.text2 }}
                    hitSlop={closeTouch.hitSlop}
                    style={HIT_SLOP_UNCLIPPED_STYLE}
                    feedbackVariant="scale"
                    background={<PressHighlight radius={Size.sheetCloseTrack / 2} />}
                  />
                ) : null}
              </View>
            )}
            {closeLifecycle.hasEverOpened ? children : null}
          </BottomSheet.Content>
        </View>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
