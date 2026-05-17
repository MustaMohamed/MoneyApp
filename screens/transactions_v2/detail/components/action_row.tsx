import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
}

export function ActionRow({ onEdit, onDelete }: Props): React.ReactElement {
  return (
    <View className="flex-row gap-2.5 px-4 pt-4 pb-6">
      <View className="flex-1">
        <Button variant="danger-soft" label={Strings.detailDeleteButton} onPress={onDelete} />
      </View>
      <View className="flex-1">
        <Button variant="primary" label={Strings.detailEditButton} onPress={onEdit} />
      </View>
    </View>
  );
}
