import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import React from 'react';
import { useFormState, type Control, type FieldPath } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { FormErrorText } from '@/components/ui/form_error_text';
import { Colors, Type } from '@/constants/theme';

import type { AddAccountFormData } from '../../utils/add_account.schema';
import {
  FIELD_MESSAGE_GLYPH,
  FIELD_MESSAGE_RAIL_STYLE,
  FIELD_MESSAGE_TEXT_LINE_HEIGHT,
} from './account_form.geometry';

export interface FieldMessageRailProps {
  control: Control<AddAccountFormData>;
  name: FieldPath<AddAccountFormData>;
  helper?: string;
}

/** Holds a fixed message track, so helper and error copy swap without shifting anything. */
export function FieldMessageRail({ control, name, helper }: FieldMessageRailProps) {
  const { errors } = useFormState({ control, name });
  const error = errors[name]?.message;

  return (
    <Box style={FIELD_MESSAGE_RAIL_STYLE} accessibilityLiveRegion="polite">
      {error ? (
        <Box
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: FIELD_MESSAGE_GLYPH.gap,
          }}
        >
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={FIELD_MESSAGE_GLYPH.size}
            color={Colors.dark.negative}
            style={{ marginTop: FIELD_MESSAGE_GLYPH.topInset }}
          />
          <Box style={{ flex: 1 }}>
            {/* Helper's own type size (mockup keeps one size across both states); animation off so the error exists in the a11y tree immediately. */}
            <FormErrorText
              message={error}
              disableAnimation
              style={{ fontSize: Type.detail, lineHeight: FIELD_MESSAGE_TEXT_LINE_HEIGHT }}
            />
          </Box>
        </Box>
      ) : helper ? (
        // Not HeroUI `Description`: it paints `--color-muted` and this copy must stay readable.
        <Typography
          className="font-inter text-foreground"
          style={{ fontSize: Type.detail, lineHeight: FIELD_MESSAGE_TEXT_LINE_HEIGHT }}
        >
          {helper}
        </Typography>
      ) : null}
    </Box>
  );
}
