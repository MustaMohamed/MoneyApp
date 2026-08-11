import { Typography } from 'heroui-native';
import React from 'react';
import { useFormState, type Control, type FieldPath } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { FormErrorText } from '@/components/ui/form_error_text';
import { Type } from '@/constants/theme';

import type { AddAccountFormData } from '../../utils/add_account.schema';
import { FIELD_MESSAGE_RAIL_STYLE, FIELD_MESSAGE_TEXT_LINE_HEIGHT } from './account_form.geometry';

export interface FieldMessageRailProps {
  control: Control<AddAccountFormData>;
  name: FieldPath<AddAccountFormData>;
  helper?: string;
}

/**
 * The permanent message rail under every field (mockup § C, `.msg`) — the
 * zero-shift contract's field-level device (spec.md § "The zero-shift
 * contract"). Reserves `Size.fieldMessageTrack` as a floor, never a ceiling
 * (account_form.geometry.ts), carrying helper copy when the field is clean
 * and the error in the exact same box when it is not — an error appearing
 * moves nothing above or below it.
 *
 * Owns its own `useFormState({ control, name })` subscription, narrowed to
 * this one field, instead of a parent reading the whole form's `errors`
 * object and threading a plain string down. Before this split, `AccountForm`
 * subscribed to the whole `errors` object at its own root, so every field's
 * validation transition re-rendered every rail (and everything else under
 * `AccountForm`, including the five-tile type grid, which reads none of it)
 * — measured at 17 renders for one error transition, 4 of them rails that
 * had nothing to do with the field that changed (debt:perf #227 / MA-009
 * quality review Q1). `name` is always a real `AddAccountFormData` key, even
 * for the colour and blank-currency rails that never carry a validation
 * message — neither field is ever the target of a schema issue, so this
 * subscription simply never fires for them; it still narrows correctly
 * rather than falling back to an unfiltered one.
 *
 * The currency field passes neither `helper` nor an error-bearing name that
 * ever fires; the rail still mounts and holds C1's blank message row, which
 * is what keeps the balance/currency row's baselines level.
 */
export function FieldMessageRail({ control, name, helper }: FieldMessageRailProps) {
  const { errors } = useFormState({ control, name });
  const error = errors[name]?.message;

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
