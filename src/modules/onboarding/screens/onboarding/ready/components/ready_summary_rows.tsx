import { ListGroup, Separator, Typography } from 'heroui-native';
import React from 'react';

import { ListCard } from '@/components/ui/list_card';
import { CURRENCY_CONFIG } from '@/constants/currency';
import type { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';

import { N4_SUMMARY_ROW_STYLE, N4_SUMMARY_ROW_TEXT_STYLE } from '../ready.geometry';

export interface ReadySummaryRowsProps {
  accountCount: number;
  baseCurrency: Currency;
}

/** No `accessibilityRole`: the item has no `onPress` and must not announce as a button. */
export function ReadySummaryRows({ accountCount, baseCurrency }: ReadySummaryRowsProps) {
  const rows: readonly { label: string; value: string }[] = [
    { label: Strings.n4RowBaseCurrency, value: CURRENCY_CONFIG[baseCurrency].code },
    { label: Strings.n4RowAccounts, value: String(accountCount) },
    { label: Strings.n4RowPrivacy, value: Strings.n4RowPrivacyValue },
  ];

  return (
    <ListCard>
      {rows.map((row, index) => (
        <React.Fragment key={row.label}>
          {/* `thickness` pins `Size.hairline` over the variant's ~0.33dp `hairlineWidth()`. */}
          {index > 0 ? <Separator thickness={Size.hairline} /> : null}
          <ListGroup.Item
            style={N4_SUMMARY_ROW_STYLE}
            accessible
            accessibilityLabel={`${row.label}, ${row.value}`}
          >
            <ListGroup.ItemContent style={{ flex: 1, minWidth: 0 }}>
              <Typography className="text-foreground font-inter" style={N4_SUMMARY_ROW_TEXT_STYLE}>
                {row.label}
              </Typography>
            </ListGroup.ItemContent>

            {/* Passing children replaces the slot's default chevron outright. */}
            <ListGroup.ItemSuffix style={{ alignItems: 'flex-end', flexShrink: 0 }}>
              <Typography className="text-foreground font-sora" style={N4_SUMMARY_ROW_TEXT_STYLE}>
                {row.value}
              </Typography>
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </React.Fragment>
      ))}
    </ListCard>
  );
}
