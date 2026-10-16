import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListGroup } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import {
  DETAIL_ROW_LABEL_FONT_SIZE,
  DETAIL_ROW_VALUE_FONT_SIZE,
  resolveDetailRowHeight,
} from './detail.geometry';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  icon: IconName;
  label: string;
  value: string;
  showDivider?: boolean;
}

export function DetailRow({ icon, label, value, showDivider = true }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <ListGroup.Item
      className={`flex-row items-center gap-3 px-4 py-3 ${showDivider ? 'border-separator border-b' : ''}`}
      style={{ height: resolveDetailRowHeight(fontScale) }}
    >
      <ListGroup.ItemPrefix>
        <View className="bg-foreground/5 h-7 w-7 items-center justify-center rounded-md">
          <MaterialCommunityIcons
            name={icon}
            size={Size.filterSegmentIcon}
            color={CoreTokens.text1}
          />
        </View>
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent className="min-w-0">
        <ListGroup.ItemDescription
          className="font-inter-semibold text-foreground/55 tracking-wide uppercase"
          allowFontScaling={false}
          style={scaledTextStyle(DETAIL_ROW_LABEL_FONT_SIZE, fontScale)}
          numberOfLines={1}
        >
          {label}
        </ListGroup.ItemDescription>
        <ListGroup.ItemTitle
          className="font-inter-medium mt-0.5"
          allowFontScaling={false}
          style={scaledTextStyle(DETAIL_ROW_VALUE_FONT_SIZE, fontScale)}
          numberOfLines={1}
        >
          {value}
        </ListGroup.ItemTitle>
      </ListGroup.ItemContent>
    </ListGroup.Item>
  );
}
