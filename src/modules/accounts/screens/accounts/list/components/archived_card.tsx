import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion, Chip, Separator, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { ListCard } from '@/components/ui/list_card';
import { Strings } from '@/constants/strings';
import { Colors, Size, Type, lineHeightFor } from '@/constants/theme';

import {
  ACCOUNTS_LIST_ARCHIVED_CARD_STYLE,
  ACCOUNTS_LIST_ARCHIVED_HEADER_STYLE,
} from '../accounts_list.geometry';
import type { AccountsListUnarchiveError } from '../accounts_list.state';
import { ArchivedAccountRow } from './archived_account_row';
import type { ArchivedAccountRowVM } from './archived_card.helpers';

const ARCHIVED_ITEM = 'archived';

interface ArchivedCardProps {
  rows: ArchivedAccountRowVM[];
  summary: string;
  isExpanded: boolean;
  unarchivingId: string | undefined;
  unarchiveError: AccountsListUnarchiveError | undefined;
  onExpandedChange: (expanded: boolean) => void;
  onPressRow: (id: string) => void;
  onUnarchive: (id: string) => void;
}

export function ArchivedCard({
  rows,
  summary,
  isExpanded,
  unarchivingId,
  unarchiveError,
  onExpandedChange,
  onPressRow,
  onUnarchive,
}: ArchivedCardProps) {
  if (rows.length === 0) return null;

  return (
    <ListCard style={ACCOUNTS_LIST_ARCHIVED_CARD_STYLE}>
      <Accordion
        selectionMode="single"
        value={isExpanded ? ARCHIVED_ITEM : ''}
        onValueChange={(value: string | undefined) => onExpandedChange(value === ARCHIVED_ITEM)}
        hideSeparator
      >
        <Accordion.Item value={ARCHIVED_ITEM}>
          {/* The trigger's own classes beat a style's padding and gap on device, so the row is an inner View. */}
          <Accordion.Trigger
            className="gap-0 px-0 py-0"
            style={{ padding: 0, gap: 0 }}
            accessibilityState={{ expanded: isExpanded }}
          >
            <View style={ACCOUNTS_LIST_ARCHIVED_HEADER_STYLE}>
              <MaterialCommunityIcons name="archive" size={Size.iconXs} color={Colors.dark.text2} />
              <Typography
                className="font-inter-semibold text-foreground"
                style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
              >
                {Strings.accountsArchivedTitle}
              </Typography>
              {/* `pointerEvents="none"`: the chip is a Pressable and would take a tap on the count from the trigger. */}
              <Chip
                size="sm"
                variant="soft"
                color="accent"
                className="self-center"
                style={{ flexShrink: 0 }}
                pointerEvents="none"
              >
                <Chip.Label
                  numberOfLines={1}
                  className="font-sora-bold text-accent"
                  style={{ fontSize: Type.overline, lineHeight: lineHeightFor(Type.overline) }}
                >
                  {rows.length}
                </Chip.Label>
              </Chip>
              {/* Blank, not absent, while expanded, so the header keeps its height. */}
              <Typography
                className="font-inter text-foreground/60"
                style={{
                  flex: 1,
                  textAlign: 'right',
                  fontSize: Type.micro,
                  lineHeight: lineHeightFor(Type.micro),
                }}
                numberOfLines={1}
              >
                {isExpanded ? '' : summary}
              </Typography>
              <Accordion.Indicator isAnimatedStyleActive={false}>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={Size.iconXs}
                  color={Colors.dark.text2}
                />
              </Accordion.Indicator>
            </View>
          </Accordion.Trigger>
          <Accordion.Content className="px-0 pb-0" style={{ padding: 0 }}>
            {rows.map((row) => (
              <React.Fragment key={row.account.id}>
                {/* B5 borders the top of every row, the first under the header. */}
                <Separator thickness={Size.hairline} />
                <ArchivedAccountRow
                  row={row}
                  isUnarchiving={unarchivingId === row.account.id}
                  isLocked={unarchivingId !== undefined}
                  errorMessage={
                    unarchiveError?.id === row.account.id ? unarchiveError.message : undefined
                  }
                  onPress={onPressRow}
                  onUnarchive={onUnarchive}
                />
              </React.Fragment>
            ))}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </ListCard>
  );
}
