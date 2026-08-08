import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback, Typography } from 'heroui-native';
import React from 'react';

import { Box } from '@/components/ui/box';
import { FormSectionLabel } from '@/components/ui/form_section_label';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing, TouchSize } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { AccountColorSheet } from './account_color_sheet';
import { resolveColorTriggerModel } from './account_color_sheet.geometry';
import { useAccountColorSheetState } from './account_color_sheet.state';

export interface AccountColorFieldProps {
  ownerId: string;
  value: string;
  onChange: (hex: string) => void;
}

/**
 * The row that opens the 32-colour sheet (mockup C1) and owns the sheet
 * itself. BottomSheet.Portal renders into the app-root PortalHost
 * (src/app/_layout.tsx:18,90), so mounting the sheet here — inside
 * ScreenScroll's content — is safe.
 */
export function AccountColorField({ ownerId, value, onChange }: AccountColorFieldProps) {
  const model = resolveColorTriggerModel(value);
  const isOpen = useAccountColorSheetState((s) => s.openOwner === ownerId);
  const open = useAccountColorSheetState.getState().open;
  const close = useAccountColorSheetState.getState().close;

  return (
    <>
      <FormSectionLabel>{Strings.accountColorSectionLabel}</FormSectionLabel>
      <PressableFeedback
        testID="account-color-trigger"
        accessibilityRole="button"
        accessibilityLabel={model.a11yLabel}
        onPress={() => open(ownerId, value)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          height: Math.max(Size.fieldHeight, TouchSize.min),
          paddingHorizontal: Spacing.sm,
          borderWidth: 1,
          borderRadius: Radius.md,
        }}
        className="bg-field-background border-field-border"
      >
        <Box
          style={{
            width: Size.colorDot,
            height: Size.colorDot,
            borderRadius: Size.colorDot / 2,
            backgroundColor: model.hex,
          }}
        />
        <Typography
          className="font-inter text-foreground text-[14px]"
          style={{ flex: 1 }}
          numberOfLines={1}
        >
          {model.familyLabel}
          {model.toneLabel ? (
            <Typography className="text-content-secondary">{` · ${model.toneLabel}`}</Typography>
          ) : null}
        </Typography>
        <MaterialCommunityIcons name="chevron-right" size={Size.iconSm} color={CoreTokens.text2} />
      </PressableFeedback>

      <AccountColorSheet
        isOpen={isOpen}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        onConfirm={onChange}
      />
    </>
  );
}
