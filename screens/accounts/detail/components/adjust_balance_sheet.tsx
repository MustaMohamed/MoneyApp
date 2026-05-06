import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { LinearGradient } from 'expo-linear-gradient';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { useAdjustBalanceSheetState } from '@/screens/accounts/detail/components/adjust_balance_sheet.state';

interface AdjustBalanceSheetProps {
  visible: boolean;
  currentBalance: number;
  currency: Currency;
  onClose: () => void;
  onSave: (newBalance: number) => void;
  isLoading: boolean;
}

export function AdjustBalanceSheet({
  visible,
  currentBalance,
  currency,
  onClose,
  onSave,
  isLoading,
}: AdjustBalanceSheetProps) {
  const {
    state: adjustState,
    setInput,
    setError,
    initialize,
  } = useAdjustBalanceSheetState(
    useShallow((s) => ({
      state: s.state,
      setInput: s.setInput,
      setError: s.setError,
      initialize: s.initialize,
    })),
  );

  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['40%'], []);

  useEffect(() => {
    if (visible) {
      initialize(currentBalance);
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible, currentBalance, initialize]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  const handleSave = () => {
    const n = parseFloat(adjustState.input);
    if (!Number.isFinite(n) || n < 0) {
      setError(Strings.errBalanceInvalid);
      return;
    }
    setError('');
    onSave(n);
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={onClose}
      snapPoints={snapPoints}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>{Strings.adjustBalanceTitle}</Text>

        <Text style={styles.fieldLabel}>{Strings.adjustBalanceLabel}</Text>
        <View style={styles.inputRow}>
          <BottomSheetTextInput
            value={adjustState.input}
            onChangeText={(v) => {
              setInput(v);
              setError('');
            }}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholderTextColor={Colors.dark.text3}
            autoFocus
          />
          <Text style={styles.currency}>{currency}</Text>
        </View>
        {!!adjustState.error && <Text style={styles.error}>{adjustState.error}</Text>}

        <View style={styles.ctaBar}>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{Strings.adjustBalanceCancel}</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={isLoading}
            style={[styles.savePress, isLoading && styles.disabled]}
          >
            <LinearGradient
              colors={[Colors.shared.cairoGold, Colors.dark.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveGradient}
            >
              <Text style={styles.saveText}>{Strings.adjustBalanceSave}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
  },
  handle: { backgroundColor: Colors.dark.border, width: 36, height: 4 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.micro,
    color: Colors.shared.cairoGold,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  input: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    backgroundColor: Colors.dark.surfaceEl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  currency: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  error: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.negative,
    marginTop: Spacing.xxs,
  },
  ctaBar: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.lg },
  cancelBtn: {
    flex: 1,
    height: Size.ctaHeight,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text2,
  },
  savePress: { flex: 2, borderRadius: Radius.cta, overflow: 'hidden' },
  disabled: { opacity: 0.5 },
  saveGradient: {
    height: Size.ctaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.cta,
  },
  saveText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
