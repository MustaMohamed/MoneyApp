import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { ACCOUNT_TYPE_ICONS } from '@/constants/account_type_icons';
import type { AccountType } from '@/constants/enums';
import { Radius, Size } from '@/constants/theme';

import { resolveAccountTileColors } from '../constants/account_tile_color';

interface AccountColorTileProps {
  color: string | null;
  type: AccountType;
  size: number;
  glyphSize: number;
  /** C4's archived treatment: a ring in the account colour instead of a fill. */
  hollow?: boolean;
}

export function AccountColorTile({ color, type, size, glyphSize, hollow }: AccountColorTileProps) {
  const tile = resolveAccountTileColors(color, hollow === true ? 'hollow' : 'filled');

  return (
    <View
      // Runtime hex: className is build-time only.
      style={{
        width: size,
        height: size,
        borderRadius: Radius.sm,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tile.background,
        borderWidth: tile.border === undefined ? 0 : Size.hairline,
        borderColor: tile.border,
      }}
    >
      <MaterialCommunityIcons name={ACCOUNT_TYPE_ICONS[type]} size={glyphSize} color={tile.glyph} />
    </View>
  );
}
