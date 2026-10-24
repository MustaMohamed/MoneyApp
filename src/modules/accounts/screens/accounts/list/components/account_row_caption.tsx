import { Typography } from 'heroui-native';
import { type TextStyle, View, type ViewStyle, useWindowDimensions } from 'react-native';

import { resolveFitLineTextProps } from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';

import { ACCOUNTS_LIST_ROW_CAPTION_STYLE } from '../accounts_list.geometry';
import { splitCaptionUnits } from '../accounts_list.helpers';

const CAPTION_CLASS = 'text-content-secondary font-inter tabular-nums';

const CAPTION_WRAP_STYLE: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  minWidth: 0,
  marginTop: ACCOUNTS_LIST_ROW_CAPTION_STYLE.marginTop,
};

const CAPTION_UNIT_STYLE: TextStyle = { maxWidth: '100%' };

/** A row caption that wraps between units: above font scale 1 each unit fits its line whole, never below its 1.0 size. */
export function AccountRowCaption({ caption }: { caption: string }) {
  const { fontScale } = useWindowDimensions();

  if (fontScale <= 1) {
    return (
      <Typography className={CAPTION_CLASS} style={ACCOUNTS_LIST_ROW_CAPTION_STYLE}>
        {caption}
      </Typography>
    );
  }

  const unitLine = resolveFitLineTextProps(Type.micro, fontScale);
  return (
    <View style={CAPTION_WRAP_STYLE}>
      {splitCaptionUnits(caption).map((unit, index) => (
        <Typography
          // A caption repeats a unit such as `0 `, so its place keys it.
          key={`${index}:${unit}`}
          className={CAPTION_CLASS}
          {...unitLine}
          style={[unitLine.style, CAPTION_UNIT_STYLE]}
        >
          {unit}
        </Typography>
      ))}
    </View>
  );
}
