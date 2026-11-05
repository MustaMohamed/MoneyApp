import { View } from 'react-native';

import { DetailDangerButton } from '@/components/ui/detail_danger_button';
import { DetailEditButton } from '@/components/ui/detail_edit_button';
import { Strings } from '@/constants/strings';

interface Props {
  onEdit: () => void;
  onStop: () => void;
}

export function CommitmentDetailActions({ onEdit, onStop }: Props): React.ReactElement {
  return (
    <View testID="commitment-detail-actions" className="px-4 pt-4">
      <View className="gap-2" style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          <DetailEditButton onPress={onEdit} />
        </View>
        <View style={{ flex: 1 }}>
          <DetailDangerButton icon="close" label={Strings.commitmentsDetailStop} onPress={onStop} />
        </View>
      </View>
    </View>
  );
}
