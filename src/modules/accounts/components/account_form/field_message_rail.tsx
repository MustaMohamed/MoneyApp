import { Typography } from 'heroui-native';
import React from 'react';

import { Box } from '@/components/ui/box';
import { FormErrorText } from '@/components/ui/form_error_text';
import { Type } from '@/constants/theme';

import { FIELD_MESSAGE_RAIL_STYLE, FIELD_MESSAGE_TEXT_LINE_HEIGHT } from './account_form.geometry';

export interface FieldMessageRailProps {
  helper?: string;
  error?: string;
}

/**
 * The permanent message rail under every field (mockup § C, `.msg`) — the
 * zero-shift contract's field-level device (spec.md § "The zero-shift
 * contract"). Reserves `Size.fieldMessageTrack` as a floor, never a ceiling
 * (account_form.geometry.ts), carrying helper copy when the field is clean
 * and the error in the exact same box when it is not — an error appearing
 * moves nothing above or below it.
 *
 * The currency field passes neither `helper` nor `error`; the rail still
 * mounts and holds C1's blank message row, which is what keeps the
 * balance/currency row's baselines level.
 */
export function FieldMessageRail({ helper, error }: FieldMessageRailProps) {
  return (
    <Box style={FIELD_MESSAGE_RAIL_STYLE}>
      {error ? (
        <FormErrorText message={error} />
      ) : helper ? (
        // Not HeroUI Description — decision 8: Description paints
        // --color-muted, and helper copy here is something a user must
        // read, not a genuinely redundant label (spec.md:122). No
        // numberOfLines: the rail is a floor, so long copy grows into the
        // scroll viewport instead of clipping (spec.md:45).
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
