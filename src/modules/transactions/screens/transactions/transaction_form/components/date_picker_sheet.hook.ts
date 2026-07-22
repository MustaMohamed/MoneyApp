import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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

  function changeIos(_event: DateTimePickerEvent, date?: Date) {
    if (date) setDraftDate(ownerId, toLocalDateString(date));
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

  function changeAndroid(event: DateTimePickerEvent, date?: Date) {
    if (useDatePickerSheetState.getState().activeOwnerId !== ownerId) return;
    closeAndroid(ownerId);
    if (event.type === 'set' && date) onChange(toLocalDateString(date));
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
    changeIos,
    cancelIos,
    commitIos,
    completeIosClose: () => completeIosClose(ownerId),
    changeAndroid,
  };
}
