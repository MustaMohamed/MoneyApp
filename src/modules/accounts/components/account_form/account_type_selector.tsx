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

const TYPE_OPTION_ROWS = chunkTypeOptions(TYPE_OPTIONS, ACCOUNT_TYPE_GRID_COLUMNS);

export function AccountTypeSelector({ form }: AccountTypeSelectorProps) {
  const { control } = form;
  const selectedType = useWatch({ control, name: 'selected_type' });

  return (
    <RadioGroup
      value={selectedType}
      onValueChange={(value) =>
        form.setValue(
          'selected_type',
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
              <AccountTypeTile
                key={option.type}
                option={option}
                isSelected={selectedType === option.type}
              />
            ) : (
              // Yoga sizes `flex: 1` on the content box, so the pad needs the tiles' box metrics.
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
