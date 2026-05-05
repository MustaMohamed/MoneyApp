import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { useFilterDateCustomPickerState } from './filter_date_custom_picker.state';

interface Props {
  visible: boolean;
  initialFrom: string | undefined;
  initialTo: string | undefined;
  onClose: () => void;
  onConfirm: (from: string, to: string) => void;
}

function isoToDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(d: Date | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FilterDateCustomPicker({
  visible,
  initialFrom,
  initialTo,
  onClose,
  onConfirm,
}: Props) {
  const {
    state: datePickerState,
    setFrom,
    setTo,
    setShowFromPicker,
    setShowToPicker,
    initialize,
  } = useFilterDateCustomPickerState(
    useShallow((s) => ({
      state: s.state,
      setFrom: s.setFrom,
      setTo: s.setTo,
      setShowFromPicker: s.setShowFromPicker,
      setShowToPicker: s.setShowToPicker,
      initialize: s.initialize,
    })),
  );

  // Re-initialize from props each time the picker opens so Reset is reflected correctly.
  useEffect(() => {
    if (!visible) return;
    initialize(isoToDate(initialFrom), isoToDate(initialTo));
  }, [visible, initialFrom, initialTo, initialize]);

  const canConfirm =
    !!datePickerState.from && !!datePickerState.to && datePickerState.from <= datePickerState.to;

  function handleFromChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowFromPicker(false);
    if (selected) setFrom(selected);
  }

  function handleToChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowToPicker(false);
    if (selected) setTo(selected);
  }

  function handleConfirm() {
    if (canConfirm && datePickerState.from && datePickerState.to) {
      onConfirm(dateToIso(datePickerState.from), dateToIso(datePickerState.to));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={ms(22)} color={Colors.dark.text2} />
          </Pressable>
          <Text style={styles.title}>{Strings.filterCustomDateRangeTitle}</Text>
          <Pressable onPress={handleConfirm} disabled={!canConfirm} hitSlop={8}>
            <Text style={[styles.doneLabel, !canConfirm && styles.doneLabelDisabled]}>
              {Strings.filterPickerDone}
            </Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Pressable
            onPress={() => setShowFromPicker(true)}
            style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
          >
            <Text style={styles.fieldLabel}>{Strings.filterCustomFromLabel}</Text>
            <Text style={styles.fieldValue}>{formatDisplay(datePickerState.from) || '—'}</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowToPicker(true)}
            style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
          >
            <Text style={styles.fieldLabel}>{Strings.filterCustomToLabel}</Text>
            <Text style={styles.fieldValue}>{formatDisplay(datePickerState.to) || '—'}</Text>
          </Pressable>
        </View>

        {datePickerState.showFromPicker && (
          <DateTimePicker
            value={datePickerState.from ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleFromChange}
            maximumDate={datePickerState.to}
          />
        )}
        {datePickerState.showToPicker && (
          <DateTimePicker
            value={datePickerState.to ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleToChange}
            minimumDate={datePickerState.from}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  handle: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  doneLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.shared.cairoGold,
  },
  doneLabelDisabled: {
    color: Colors.dark.text2,
    opacity: 0.5,
  },
  body: { gap: Spacing.sm, paddingTop: Spacing.sm },
  field: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  fieldPressed: { opacity: 0.7 },
  fieldLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  fieldValue: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
});
