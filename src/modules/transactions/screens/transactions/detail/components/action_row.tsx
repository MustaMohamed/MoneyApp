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

export function ActionRow(props: Props): React.ReactElement {
  if (props.onViewCommitment) {
    return (
      <View className="px-4 pt-4 pb-6" style={{ minHeight: DETAIL_ACTION_MIN_HEIGHT }}>
        <Button variant="primary" label={Strings.viewCommitment} onPress={props.onViewCommitment} />
      </View>
    );
  }

  if (props.notice !== undefined) {
    return (
      <View className="px-4 pt-4 pb-6" style={{ minHeight: DETAIL_ACTION_MIN_HEIGHT }}>
        <Text
          className="font-inter text-content-secondary"
          style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
        >
          {props.notice}
        </Text>
      </View>
    );
  }

  return (
    <View className="px-4 pt-4 pb-6" style={{ minHeight: DETAIL_ACTION_MIN_HEIGHT }}>
      <Button
        variant="danger-soft"
        label={Strings.detailDeleteButton}
        onPress={props.onDelete}
        className="w-full"
      />
    </View>
  );
}
