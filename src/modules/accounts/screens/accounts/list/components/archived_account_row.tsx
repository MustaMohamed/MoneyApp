import { ListGroup, Typography } from 'heroui-native';
import { View } from 'react-native';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { resolveAccountName } from '@/utils/account_name';

import { resolveAccountRowA11yLabel } from '../../../../constants/account_row_a11y_label';
import {
  ACCOUNTS_LIST_ARCHIVED_ROW_STYLE,
  ACCOUNTS_LIST_ROW_CAPTION_STYLE,
} from '../accounts_list.geometry';
import type { ArchivedAccountRowVM } from './archived_card.helpers';

const UNARCHIVE_ACTION = 'unarchive';

interface ArchivedAccountRowProps {
  row: ArchivedAccountRowVM;
  isUnarchiving: boolean;
  /** Any restore in flight locks every row's Unarchive. */
  isLocked: boolean;
  errorMessage: string | undefined;
  onPress: (id: string) => void;
  onUnarchive: (id: string) => void;
}

export function ArchivedAccountRow({
  row: { account, caption },
  isUnarchiving,
  isLocked,
  errorMessage,
  onPress,
  onUnarchive,
}: ArchivedAccountRowProps) {
  return (
    <View>
      <ListGroup.Item
        onPress={() => onPress(account.id)}
        style={ACCOUNTS_LIST_ARCHIVED_ROW_STYLE}
        accessibilityRole="button"
        accessibilityLabel={resolveAccountRowA11yLabel(account)}
        // The item is one focus stop on iOS, so the nested Unarchive is reached as an action.
        accessibilityActions={[
          { name: UNARCHIVE_ACTION, label: Strings.accountsArchivedUnarchive },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === UNARCHIVE_ACTION && !isUnarchiving && !isLocked) {
            onUnarchive(account.id);
          }
        }}
      >
        <AccountColorTile
          color={account.color}
          type={account.type}
          size={Size.accountTile}
          glyphSize={Size.iconXs}
          hollow
        />

        <ListGroup.ItemContent style={{ flex: 1, minWidth: 0 }}>
          <ListGroup.ItemTitle
            className="text-foreground/80 font-inter-medium"
            style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {resolveAccountName(account)}
          </ListGroup.ItemTitle>
          <Typography
            className="text-content-secondary font-inter tabular-nums"
            style={ACCOUNTS_LIST_ROW_CAPTION_STYLE}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {caption}
          </Typography>
        </ListGroup.ItemContent>

        <ListGroup.ItemSuffix style={{ flexShrink: 0 }}>
          <Button
            variant="secondary"
            flat
            tone="accent"
            size="sm"
            icon="archive-arrow-up"
            label={Strings.accountsArchivedUnarchive}
            isLoading={isUnarchiving}
            isDisabled={isUnarchiving || isLocked}
            onPress={() => onUnarchive(account.id)}
          />
        </ListGroup.ItemSuffix>
      </ListGroup.Item>

      {errorMessage === undefined ? null : (
        <Typography
          accessibilityRole="alert"
          className="text-danger font-inter"
          style={[ACCOUNTS_LIST_ROW_CAPTION_STYLE, { paddingLeft: Spacing.md }]}
          numberOfLines={1}
        >
          {errorMessage}
        </Typography>
      )}
    </View>
  );
}
