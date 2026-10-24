import { View } from 'react-native';

import { ACCOUNT_STRIP_WRAPPER_PADDING_Y } from '@/components/ui/form_sheet.geometry';

export function FormStrip({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <View
      className="border-separator border-b"
      style={{ paddingVertical: ACCOUNT_STRIP_WRAPPER_PADDING_Y }}
    >
      {children}
    </View>
  );
}
