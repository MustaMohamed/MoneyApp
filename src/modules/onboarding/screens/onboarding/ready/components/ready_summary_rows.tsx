import { ListGroup, Separator, Typography } from 'heroui-native';
import React from 'react';

import { CURRENCY_CONFIG } from '@/constants/currency';
import type { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Radius, Size } from '@/constants/theme';

import { N4_SUMMARY_ROW_STYLE, N4_SUMMARY_ROW_TEXT_STYLE } from '../ready.geometry';

export interface ReadySummaryRowsProps {
  accountCount: number;
  baseCurrency: Currency;
}

/**
 * The three-row confirmation group under the hero — mockup.html:2342-2356,
 * `.lgrp`. Facts the user just supplied, restated once: what they chose, how
 * many accounts they saved, and where it all lives.
 *
 * `Accounts` renders the NON-archived count the hero was computed from, so the
 * row and the number above it can never disagree.
 *
 * `accessible` + one label per row makes a screen reader announce each row as
 * one thing instead of two. No `accessibilityRole`: `ListGroup.Item` is a
 * `Pressable` with no `onPress` here and must not announce as a button — the
 * same call `AccountRow` makes on N3.
 */
export function ReadySummaryRows({ accountCount, baseCurrency }: ReadySummaryRowsProps) {
  const rows: readonly { label: string; value: string }[] = [
    { label: Strings.n4RowBaseCurrency, value: CURRENCY_CONFIG[baseCurrency].code },
    { label: Strings.n4RowAccounts, value: String(accountCount) },
    { label: Strings.n4RowPrivacy, value: Strings.n4RowPrivacyValue },
  ];

  return (
    /* The Surface trap (§5.2), invisible to every CI check. ListGroup
       is Surface-based and `.surface__root` resolves to `p-4
       rounded-3xl shadow-surface overflow-hidden` with no border,
       ever — so the border, the radius and `p-0` are each required.
       `shadow-none` loses to the custom --shadow-surface token; the
       `elevation`/`shadowOpacity` pair below does not beat it either,
       because uniwind keys that token as `boxShadow`, a separate RN
       pipeline (measured on device). Kept for consistency with the
       other Surface call sites (debt:quality #246). */
    <ListGroup
      className="border-separator p-0"
      style={{
        borderWidth: Size.hairline,
        borderRadius: Radius.lg,
        elevation: 0,
        shadowOpacity: 0,
      }}
    >
      {rows.map((row, index) => (
        <React.Fragment key={row.label}>
          {/* Full bleed, and drawn by the parent, exactly as N3 does it:
              `thickness` pins Size.hairline over the variant class's
              hairlineWidth(), which is ~0.33dp on a 3x device against the
              group border's 1. */}
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
    </ListGroup>
  );
}
