import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

import { DETAIL_ACTION_MIN_HEIGHT } from './detail_geometry';

interface MutableProps {
  onDelete: () => void;
  onViewCommitment?: never;
  notice?: never;
}

interface OwnedProps {
  onDelete?: never;
  onViewCommitment: () => void;
  notice?: never;
}

interface NoticeProps {
  onDelete?: never;
  onViewCommitment?: never;
  notice: string;
}

type Props = MutableProps | OwnedProps | NoticeProps;

function ActionRowContent(props: Props): React.ReactElement {
  if (props.onViewCommitment) {
    return (
      <Button variant="primary" label={Strings.viewCommitment} onPress={props.onViewCommitment} />
    );
  }

  if (props.notice !== undefined) {
    return (
      <Text
        className="font-inter text-content-secondary"
        style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
      >
        {props.notice}
      </Text>
    );
  }

  return (
    <Button
      variant="danger-soft"
      label={Strings.detailDeleteButton}
      onPress={props.onDelete}
      className="w-full"
    />
  );
}

export function ActionRow(props: Props): React.ReactElement {
  return (
    <View className="px-4 pt-4 pb-6" style={{ minHeight: DETAIL_ACTION_MIN_HEIGHT }}>
      <ActionRowContent {...props} />
    </View>
  );
}
