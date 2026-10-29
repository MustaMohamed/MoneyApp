import { View } from 'react-native';

import { DetailEditButton } from '@/components/ui/detail_edit_button';

interface Props {
  onEdit: () => void;
}

export function CommitmentDetailActions({ onEdit }: Props): React.ReactElement {
  return (
    <View testID="commitment-detail-actions" className="px-4 pt-4">
      <View className="gap-2" style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          <DetailEditButton onPress={onEdit} />
        </View>
      </View>
    </View>
  );
}
