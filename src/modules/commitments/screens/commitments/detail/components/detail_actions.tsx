import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface Props {
  onEdit: () => void;
}

export function CommitmentDetailActions({ onEdit }: Props): React.ReactElement {
  return (
    <View testID="commitment-detail-actions" className="px-4 pt-4">
      <View className="gap-2" style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            flat
            icon="pencil-outline"
            label={Strings.detailEditButton}
            onPress={onEdit}
          />
        </View>
      </View>
    </View>
  );
}
