import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { toLocalDateString } from '@/utils/format_date';

import { useDatePickerSheetState } from './date_picker_sheet.state';

function toPickerDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function useTransactionDatePicker(value: string, onChange: (next: string) => void) {
  const { isOpen, showAndroidPicker, draftDate } = useDatePickerSheetState(
    useShallow((state) => ({
      isOpen: state.isOpen,
      showAndroidPicker: state.showAndroidPicker,
      draftDate: state.draftDate,
    })),
  );
  const openIos = useDatePickerSheetState.getState().openIos;
  const openAndroid = useDatePickerSheetState.getState().openAndroid;
  const setDraftDate = useDatePickerSheetState.getState().setDraftDate;
  const closeIos = useDatePickerSheetState.getState().closeIos;
  const closeAndroid = useDatePickerSheetState.getState().closeAndroid;
  const reset = useDatePickerSheetState.getState().reset;

  useEffect(() => reset, [reset]);

  function open() {
    if (Platform.OS === 'ios') openIos(value);
    else openAndroid(value);
  }

  function changeIos(_event: DateTimePickerEvent, date?: Date) {
    if (date) setDraftDate(toLocalDateString(date));
  }

  function cancelIos() {
    closeIos();
  }

  function commitIos() {
    const nextDate = useDatePickerSheetState.getState().draftDate;
    closeIos();
    onChange(nextDate);
  }

  function changeAndroid(event: DateTimePickerEvent, date?: Date) {
    closeAndroid();
    if (event.type === 'set' && date) onChange(toLocalDateString(date));
  }

  return {
    state: {
      isOpen,
      showAndroidPicker,
      pickerDate: toPickerDate(draftDate || value),
      maximumDate: new Date(),
    },
    open,
    changeIos,
    cancelIos,
    commitIos,
    changeAndroid,
  };
}
