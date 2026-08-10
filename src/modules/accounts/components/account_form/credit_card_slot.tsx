import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, Typography } from 'heroui-native';
import React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Size, Spacing, Type } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import type { AddAccountFormData } from '../../utils/add_account.schema';
import { CREDIT_SLOT_MIN_HEIGHT } from './account_form.geometry';
import { CreditCardFields } from './credit_card_fields';

export interface CreditCardSlotProps {
  form: UseFormReturn<AddAccountFormData>;
  isCreditCard: boolean;
}

/**
 * The reserved credit-card slot (mockup C1 → C5) — the single unconditional
 * node of MA-009 plan decision 3. Rendered in exactly the same position by
 * every caller of this component regardless of `isCreditCard`; only the
 * content inside swaps, which is what makes "the real fields open exactly
 * where the hint was" structural rather than visual.
 */
export function CreditCardSlot({ form, isCreditCard }: CreditCardSlotProps) {
  if (!isCreditCard) {
    return (
      <Box
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
        {/* Full-strength, not the mockup's --content-secondary — decision 8
            generalised: this hint is the only content in the box and is
            exactly the kind of copy a user must read (spec.md:122), the
            same shape as a field's helper-rail copy. */}
        <Typography
          className="font-inter text-foreground"
          style={{ flex: 1, fontSize: Type.caption, lineHeight: Math.round(Type.caption * 1.35) }}
        >
          {Strings.accountSlotHint}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      style={{ borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' }}
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
            lineHeight: Math.round(Type.body * 1.3),
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
