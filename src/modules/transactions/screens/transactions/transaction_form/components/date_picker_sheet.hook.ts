import type { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { toLocalDateString } from '@/utils/format_date';

import { useDatePickerSheetState } from './date_picker_sheet.state';

function toPickerDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function useTransactionDatePicker(
  ownerId: string,
  value: string,
  onChange: (next: string) => void,
) {
  const { activeOwnerId, isOpen, isIosMounted, showAndroidPicker, draftDate } =
    useDatePickerSheetState(
      useShallow((state) => ({
        activeOwnerId: state.activeOwnerId,
        isOpen: state.isOpen,
        isIosMounted: state.isIosMounted,
        showAndroidPicker: state.showAndroidPicker,
        draftDate: state.draftDate,
      })),
    );
  const openIos = useDatePickerSheetState.getState().openIos;
  const openAndroid = useDatePickerSheetState.getState().openAndroid;
  const setDraftDate = useDatePickerSheetState.getState().setDraftDate;
  const closeIos = useDatePickerSheetState.getState().closeIos;
  const completeIosClose = useDatePickerSheetState.getState().completeIosClose;
  const closeAndroid = useDatePickerSheetState.getState().closeAndroid;
  const release = useDatePickerSheetState.getState().release;

  useEffect(() => () => release(ownerId), [ownerId, release]);

  const ownsPicker = activeOwnerId === ownerId;

  function open() {
    if (Platform.OS === 'ios') openIos(ownerId, value);
    else openAndroid(ownerId, value);
  }

  function selectIos(_event: DateTimePickerChangeEvent, date: Date) {
    setDraftDate(ownerId, toLocalDateString(date));
  }

  function cancelIos() {
    closeIos(ownerId);
  }

  function commitIos() {
    const pickerState = useDatePickerSheetState.getState();
    if (pickerState.activeOwnerId !== ownerId) return;
    const nextDate = pickerState.draftDate;
    closeIos(ownerId);
    onChange(nextDate);
  }

  // datetimepicker 9 split the old single `onChange` in two. Both halves must still
  // close the picker: under `onChange` that close ran before the
  // `event.type === 'set'` check, so it happened on cancel too, and dropping it from
  // the dismiss path would strand the store with the picker marked open — invisible,
  // since the native dialog has already gone.
  //
  // The explicit owner check is only on the select half, where it gates the caller's
  // `onChange`. The dismiss half does not need one: `closeAndroid` already no-ops
  // unless `activeOwnerId` matches, so a stale owner's dismissal cannot close a
  // newer owner's picker.
  function selectAndroid(_event: DateTimePickerChangeEvent, date: Date) {
    if (useDatePickerSheetState.getState().activeOwnerId !== ownerId) return;
    closeAndroid(ownerId);
    onChange(toLocalDateString(date));
  }

  function dismissAndroid() {
    closeAndroid(ownerId);
  }

  return {
    state: {
      isOpen: ownsPicker && isOpen,
      shouldRenderIos: ownsPicker && isIosMounted,
      showAndroidPicker: ownsPicker && showAndroidPicker,
      pickerDate: toPickerDate(ownsPicker && draftDate ? draftDate : value),
      maximumDate: new Date(),
    },
    open,
    selectIos,
    cancelIos,
    commitIos,
    completeIosClose: () => completeIosClose(ownerId),
    selectAndroid,
    dismissAndroid,
  };
}
