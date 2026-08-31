import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, Typography } from 'heroui-native';
import React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import type { AddAccountFormData } from '../../utils/add_account.schema';
import { CREDIT_SLOT_MIN_HEIGHT } from './account_form.geometry';
import { CreditCardFields } from './credit_card_fields';

export interface CreditCardSlotProps {
  form: UseFormReturn<AddAccountFormData>;
  isCreditCard: boolean;
}

/** Same tree position either way, so the real fields open exactly where the hint was. */
export function CreditCardSlot({ form, isCreditCard }: CreditCardSlotProps) {
  if (!isCreditCard) {
    return (
      <Box
        // Distinct `key` remounts the Box; Android keeps a style prop the new object omits.
        key="hint"
        style={{
          minHeight: CREDIT_SLOT_MIN_HEIGHT,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderRadius: Radius.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          padding: Spacing.sm,
        }}
        className="border-separator"
      >
        <MaterialCommunityIcons name="credit-card" size={Size.iconMd} color={CoreTokens.text3} />
        {/* Not the mockup's `--content-secondary`: this hint is copy the user must read. */}
        <Typography
          className="font-inter text-foreground"
          style={{ flex: 1, fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
        >
          {Strings.accountSlotHint}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      key="credit"
      // `borderStyle` is explicit: Android does not reset a property absent from the new object.
      style={{ borderWidth: 1, borderStyle: 'solid', borderRadius: Radius.md, overflow: 'hidden' }}
      className="border-separator"
    >
      <Box
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.xs,
          padding: Spacing.sm,
        }}
        className="border-separator border-b"
      >
        <MaterialCommunityIcons name="credit-card" size={Size.iconSm} color={Colors.dark.gold} />
        <Typography
          className="font-sora-bold"
          style={{
            flex: 1,
            fontSize: Type.body,
            lineHeight: lineHeightFor(Type.body),
            color: Colors.dark.gold,
          }}
        >
          {Strings.accountSlotTitle}
        </Typography>
        <Chip size="sm" variant="soft" color="accent">
          <Chip.Label>{Strings.accountSlotChip}</Chip.Label>
        </Chip>
      </Box>
      <Box style={{ padding: Spacing.sm, gap: Spacing.xs }}>
        <CreditCardFields form={form} />
      </Box>
    </Box>
  );
}
