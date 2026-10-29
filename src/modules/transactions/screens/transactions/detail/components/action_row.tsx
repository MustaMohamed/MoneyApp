import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { DetailEditButton } from '@/components/ui/detail_edit_button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

import type { DetailActions } from '../detail.helpers';

type Props = DetailActions & {
  onEdit: () => void;
  onDelete: () => void;
  onViewCommitment: () => void;
};

function ActionRowContent(props: Props): React.ReactElement {
  switch (props.actionSet) {
    case 'viewCommitment':
      return (
        <Button
          variant="primary"
          flat
          label={Strings.viewCommitment}
          onPress={props.onViewCommitment}
        />
      );
    case 'archivedNotice':
      return (
        <Text
          className="font-inter text-content-secondary"
          style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
        >
          {props.notice}
        </Text>
      );
    case 'editDelete':
      return (
        <View className="gap-2" style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <DetailEditButton onPress={props.onEdit} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              flat
              tone="danger"
              icon="trash-can-outline"
              label={Strings.detailDeleteButton}
              onPress={props.onDelete}
            />
          </View>
        </View>
      );
    default: {
      const unhandled: never = props;
      return unhandled;
    }
  }
}

export function ActionRow(props: Props): React.ReactElement {
  return (
    <View testID="detail-actions" className="px-4 pt-4 pb-6">
      <ActionRowContent {...props} />
    </View>
  );
}
