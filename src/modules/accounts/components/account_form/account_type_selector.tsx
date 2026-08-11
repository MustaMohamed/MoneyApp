import { RadioGroup } from 'heroui-native';
import React from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { Strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';

import type { AddAccountFormData } from '../../utils/add_account.schema';
import { TYPE_OPTIONS } from '../account_type_pill';
import { ACCOUNT_TYPE_GRID_COLUMNS, chunkTypeOptions } from './account_form.geometry';
import { AccountTypeTile } from './account_type_tile';

export interface AccountTypeSelectorProps {
  form: UseFormReturn<AddAccountFormData>;
}

// Computed once at module load, not per render: TYPE_OPTIONS and
// ACCOUNT_TYPE_GRID_COLUMNS are both module-level constants, so re-running
// chunkTypeOptions on every render recomputed the same two rows on every
// keystroke, error transition and tile tap for no reason (debt:perf #227
// rider / MA-009 quality review Q1).
const TYPE_OPTION_ROWS = chunkTypeOptions(TYPE_OPTIONS, ACCOUNT_TYPE_GRID_COLUMNS);

/**
 * The 3-column, 5-tile account-type grid (mockup C1). Rows of three via
 * `flex: 1` inside a fixed-count row are exact at every width with no
 * measurement pass, no first-frame flash and no percentage magic number
 * that has to be re-derived whenever the gap changes — boring and proven
 * (MA-009 plan step 7). `chunkTypeOptions` pads the last row with `null`,
 * rendered as an unlabelled `flex: 1` spacer so the grid stays left-aligned
 * by construction; the chunking input never depends on selection, so grid
 * position cannot move when the user picks a tile.
 */
export function AccountTypeSelector({ form }: AccountTypeSelectorProps) {
  const { control } = form;
  const selectedType = useWatch({ control, name: 'selected_type' });

  return (
    <RadioGroup
      value={selectedType}
      onValueChange={(value) =>
        form.setValue(
          'selected_type',
          // RadioGroup is generic over string; every value it can carry here
          // comes from TYPE_OPTIONS' own AccountType values, so this is sound.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- RadioGroup's onValueChange is (string)=>void; values only ever come from TYPE_OPTIONS' AccountType entries
          value as AddAccountFormData['selected_type'],
          { shouldValidate: true },
        )
      }
      accessibilityLabel={Strings.accountTypeLabel}
      style={{ gap: Spacing.xs }}
    >
      {TYPE_OPTION_ROWS.map((row, rowIndex) => (
        <Box key={rowIndex} style={{ flexDirection: 'row', gap: Spacing.xs }}>
          {row.map((option, cellIndex) =>
            option ? (
              <AccountTypeTile key={option.type} option={option} />
            ) : (
              // Yoga resolves `flexBasis: 0` against the *content* box, so a
              // bare `flex: 1` pad cell shares the row's free space with the
              // real tiles' padding + border stripped out — the pad ends up
              // narrower and every tile after it wider (impl review round 1,
              // D1, measured on device: 318/318/318 vs 334/334). Giving the
              // pad the same box metrics as TILE_BOX_STYLE (minus the height,
              // which a spacer doesn't need) makes it consume an identical
              // content-box share, so all three columns in every row measure
              // equal.
              <Box
                key={`pad-${cellIndex}`}
                style={{
                  flex: 1,
                  padding: Spacing.xs,
                  borderWidth: 1,
                  borderColor: Colors.shared.transparent,
                }}
              />
            ),
          )}
        </Box>
      ))}
    </RadioGroup>
  );
}
