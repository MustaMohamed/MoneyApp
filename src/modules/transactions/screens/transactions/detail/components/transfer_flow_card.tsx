import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { Text } from '@/components/ui/text';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';

import type { TransferFlow, TransferFlowCell } from '../detail.helpers';
import {
  DETAIL_TRANSFER_AMOUNT_FONT_SIZE,
  DETAIL_TRANSFER_CELL_GAP,
  DETAIL_TRANSFER_LABEL_FONT_SIZE,
  DETAIL_TRANSFER_NAME_FONT_SIZE,
  DETAIL_TRANSFER_TILE,
  resolveTransferCellHeight,
} from './detail.geometry';
import { TransferFlowCardFrame } from './detail_card_frames';

interface Props {
  flow: TransferFlow;
  onOpenAccount: (accountId: string) => void;
}

// Both wrappers stretch to the card, so the labels, tiles and names of the two cells sit level.
const CELL_WRAPPER_STYLE = { flex: 1, alignSelf: 'stretch' } as const;

function Cell({
  label,
  cell,
  onOpenAccount,
}: {
  label: string;
  cell: TransferFlowCell;
  onOpenAccount: (accountId: string) => void;
}): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const { open } = cell;
  const content = (
    <View
      testID="transaction-detail-transfer-cell"
      className="items-center"
      style={{ height: resolveTransferCellHeight(fontScale), gap: DETAIL_TRANSFER_CELL_GAP }}
    >
      <Text
        className="font-inter-semibold text-foreground/55 tracking-wide uppercase"
        allowFontScaling={false}
        style={scaledTextStyle(DETAIL_TRANSFER_LABEL_FONT_SIZE, fontScale)}
      >
        {label}
      </Text>
      <AccountColorTile {...cell.tile} size={DETAIL_TRANSFER_TILE} glyphSize={Size.iconMd} />
      <Text
        className="font-inter-semibold text-foreground"
        allowFontScaling={false}
        style={scaledTextStyle(DETAIL_TRANSFER_NAME_FONT_SIZE, fontScale)}
        numberOfLines={1}
      >
        {cell.name}
      </Text>
      {cell.amountText ? (
        <Text
          className="font-sora-semibold text-foreground/85"
          allowFontScaling={false}
          style={scaledTextStyle(DETAIL_TRANSFER_AMOUNT_FONT_SIZE, fontScale)}
          numberOfLines={1}
        >
          {cell.amountText.display}
        </Text>
      ) : null}
    </View>
  );

  if (open) {
    return (
      <PressableFeedback
        onPress={() => onOpenAccount(open.accountId)}
        accessibilityRole="button"
        accessibilityLabel={open.accessibilityLabel}
        style={CELL_WRAPPER_STYLE}
      >
        {content}
      </PressableFeedback>
    );
  }
  return <View style={CELL_WRAPPER_STYLE}>{content}</View>;
}

export function TransferFlowCard({ flow, onOpenAccount }: Props): React.ReactElement {
  return (
    <TransferFlowCardFrame className="border-accent/18 flex-row items-center gap-2">
      <Cell label={Strings.detailFlowFromLabel} cell={flow.from} onOpenAccount={onOpenAccount} />
      <MaterialCommunityIcons name="arrow-right" size={Size.iconBack} color={GoldTokens[500]} />
      <Cell label={Strings.detailFlowToLabel} cell={flow.to} onOpenAccount={onOpenAccount} />
    </TransferFlowCardFrame>
  );
}
