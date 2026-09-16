import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import React from 'react';
import {
  get,
  useFormState,
  type Control,
  type FieldError,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { FormErrorText } from '@/components/ui/form_error_text';
import { Colors, Type } from '@/constants/theme';

import {
  FIELD_MESSAGE_GLYPH,
  FIELD_MESSAGE_RAIL_STYLE,
  FIELD_MESSAGE_TEXT_LINE_HEIGHT,
} from './account_form.geometry';

export interface FieldMessageRailProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  helper?: string;
}

/** Holds a fixed message track, so helper and error copy swap without shifting anything. */
export function FieldMessageRail<T extends FieldValues>({
  control,
  name,
  helper,
}: FieldMessageRailProps<T>) {
  const { errors } = useFormState({ control, name });
  // oxlint-disable-next-line typescript/no-unsafe-assignment -- RHF's `get` returns any; `errors` at a field path holds a FieldError
  const fieldError: FieldError | undefined = get(errors, name);
  const error = fieldError?.message;

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
