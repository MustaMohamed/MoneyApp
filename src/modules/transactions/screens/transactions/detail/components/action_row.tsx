import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

import { DETAIL_ACTION_MIN_HEIGHT } from './detail_geometry';

interface MutableProps {
  onEdit: () => void;
  onDelete: () => void;
  onViewCommitment?: never;
}

interface OwnedProps {
  onEdit?: never;
  onDelete?: never;
  onViewCommitment: () => void;
}

type Props = MutableProps | OwnedProps;

export function ActionRow(props: Props): React.ReactElement {
  if (props.onViewCommitment) {
    return (
      <View className="px-4 pt-4 pb-6" style={{ minHeight: DETAIL_ACTION_MIN_HEIGHT }}>
        <Button variant="primary" label={Strings.viewCommitment} onPress={props.onViewCommitment} />
      </View>
    );
  }

  return (
    <View
      className="flex-row gap-2.5 px-4 pt-4 pb-6"
      style={{ minHeight: DETAIL_ACTION_MIN_HEIGHT }}
    >
      <View className="flex-1">
        <Button variant="danger-soft" label={Strings.detailDeleteButton} onPress={props.onDelete} />
      </View>
      <View className="flex-1">
        <Button variant="primary" label={Strings.detailEditButton} onPress={props.onEdit} />
      </View>
    </View>
  );
}
