import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FORM_SHEET_STATUS_GAP } from '@/components/ui/form_sheet.geometry';
import { StatusTrack } from '@/components/ui/status_track';

interface FormSheetFooterProps {
  statusTestID: string;
  showsStatusTrack: boolean;
  footnote?: string;
  message?: string;
  label: string;
  isLoading: boolean;
  isDisabled?: boolean;
  onPress: () => void;
}

/** No HeroUI primitive fits: a form sheet's status track over its flat primary button. */
export function FormSheetFooter(props: FormSheetFooterProps): React.ReactElement {
  const { statusTestID, showsStatusTrack, footnote, message, ...button } = props;
  return (
    <View>
      {showsStatusTrack ? (
        <>
          <StatusTrack testID={statusTestID} footnote={footnote} message={message} />
          <View style={{ height: FORM_SHEET_STATUS_GAP }} />
        </>
      ) : null}
      <Button variant="primary" flat {...button} />
    </View>
  );
}
