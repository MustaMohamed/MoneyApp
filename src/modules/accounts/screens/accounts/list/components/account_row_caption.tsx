import { Typography } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import {
  resolveFitLineTextProps,
  resolveWrappingTextProps,
} from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';

import { ACCOUNTS_LIST_ROW_CAPTION_STYLE } from '../accounts_list.geometry';
import { splitCaptionWords } from '../accounts_list.helpers';

const CAPTION_CLASS = 'text-content-secondary font-inter tabular-nums';

/** A row caption that wraps at word edges: above font scale 1 each word fits its line whole, never below its 1.0 size. */
export function AccountRowCaption({ caption }: { caption: string }) {
  const { fontScale } = useWindowDimensions();

  if (fontScale <= 1) {
    const wrapping = resolveWrappingTextProps(undefined);
    return (
      <Typography
        className={CAPTION_CLASS}
        {...wrapping}
        style={[ACCOUNTS_LIST_ROW_CAPTION_STYLE, wrapping.style]}
      >
        {caption}
      </Typography>
    );
  }

  const wordLine = resolveFitLineTextProps(Type.micro, fontScale);
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        minWidth: 0,
        marginTop: ACCOUNTS_LIST_ROW_CAPTION_STYLE.marginTop,
      }}
    >
      {splitCaptionWords(caption).map((word, index) => (
        <Typography
          // A caption repeats a word such as `·`, so its place keys it.
          key={`${index}:${word}`}
          className={CAPTION_CLASS}
          {...wordLine}
          style={[wordLine.style, { maxWidth: '100%' }]}
        >
          {word}
        </Typography>
      ))}
    </View>
  );
}
