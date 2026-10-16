import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

import type { DetailActionSet } from '../detail.helpers';

interface Props {
  actionSet: DetailActionSet;
  /** Drawn under `archivedNotice` alone: a commitment's payment on an archived account carries one too. */
  notice?: string;
  onEdit: () => void;
  onDelete: () => void;
  onViewCommitment: () => void;
}

function ActionRowContent({
  actionSet,
  notice,
  onEdit,
  onDelete,
  onViewCommitment,
}: Props): React.ReactElement | null {
  if (actionSet === 'viewCommitment') {
    return (
      <Button variant="primary" flat label={Strings.viewCommitment} onPress={onViewCommitment} />
    );
  }

  if (actionSet === 'archivedNotice') {
    return notice === undefined ? null : (
      <Text
        className="font-inter text-content-secondary"
        style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
      >
        {notice}
      </Text>
    );
  }

  return (
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
      <View style={{ flex: 1 }}>
        <Button
          variant="secondary"
          flat
          tone="danger"
          icon="trash-can-outline"
          label={Strings.detailDeleteButton}
          onPress={onDelete}
        />
      </View>
    </View>
  );
}

export function ActionRow(props: Props): React.ReactElement {
  return (
    <View testID="detail-actions" className="px-4 pt-4 pb-6">
      <ActionRowContent {...props} />
    </View>
  );
}
