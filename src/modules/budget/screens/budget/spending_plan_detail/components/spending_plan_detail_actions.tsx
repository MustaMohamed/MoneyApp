import { View } from 'react-native';

import { DetailEditButton } from '@/components/ui/detail_edit_button';

interface Props {
  onEdit: () => void;
}

export function SpendingPlanDetailActions({ onEdit }: Props): React.ReactElement {
  return (
    <View testID="spending-plan-detail-actions" className="px-4 pt-4">
      <View className="gap-2" style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          <DetailEditButton onPress={onEdit} />
        </View>
        {/* MA-305's Remove takes this cell. */}
        <View style={{ flex: 1 }} />
      </View>
    </View>
  );
}
