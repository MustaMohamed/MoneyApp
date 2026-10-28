import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { View, useWindowDimensions } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { resolveSheetSizeAboveOne } from '@/components/ui/sheet.helpers';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';

interface DatePickerSheetProps {
  isOpen: boolean;
  title: string;
  value: Date;
  maximumDate?: Date;
  onValueChange: (event: DateTimePickerChangeEvent, date: Date) => void;
  onCancel: () => void;
  onDone: () => void;
  onCloseComplete: () => void;
}

export function DatePickerSheet(props: DatePickerSheetProps): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const footer = (
    <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
      <Button
        testID="date-picker-cancel"
        className="flex-1"
        variant="secondary"
        label={Strings.addTxDatePickerCancel}
        onPress={props.onCancel}
      />
      <Button
        testID="date-picker-done"
        className="flex-1"
        variant="primary"
        label={Strings.addTxDatePickerDone}
        onPress={props.onDone}
      />
    </View>
  );

  return (
    <Sheet
      isOpen={props.isOpen}
      onOpenChange={(open) => {
        if (!open) props.onCancel();
      }}
      onCloseComplete={props.onCloseComplete}
      title={props.title}
      size={resolveSheetSizeAboveOne('sm', fontScale)}
      footer={footer}
    >
      <View className="px-4 pb-3">
        <DateTimePicker
          testID="date-picker-ios"
          value={props.value}
          mode="date"
          display="spinner"
          themeVariant="dark"
          maximumDate={props.maximumDate}
          onValueChange={props.onValueChange}
        />
      </View>
    </Sheet>
  );
}
