import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Radio, RadioGroup, Typography, cn } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

import {
  CURRENCY_OPTIONS,
  CURRENCY_ROW_STYLE,
  resolveCurrencyOptionA11y,
} from '../welcome.geometry';

export interface CurrencyChoiceProps {
  selected: Currency;
  onSelect: (value: Currency) => void;
}

/** Selection changes colour only; `CURRENCY_ROW_STYLE` is shared by both states. */
export function CurrencyChoice({ selected, onSelect }: CurrencyChoiceProps) {
  return (
    <View>
      <Typography
        className="text-content-secondary font-inter-semibold"
        style={{
          fontSize: Type.detail,
          lineHeight: lineHeightFor(Type.detail),
          marginBottom: Spacing.xs,
        }}
      >
        {Strings.n1CurrencyQuestion}
      </Typography>
      <RadioGroup
        value={selected}
        onValueChange={(value) =>
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- RadioGroup's onValueChange is (string)=>void; values only ever come from CURRENCY_OPTIONS' Currency entries
          onSelect(value as Currency)
        }
        accessibilityLabel={Strings.n1CurrencyQuestion}
        style={{ gap: Spacing.xs }}
      >
        {CURRENCY_OPTIONS.map((option) => {
          // `RadioGroup.Item`'s style is fixed at JSX time, before the render-prop runs.
          const isSelected = option.value === selected;

          return (
            <RadioGroup.Item
              key={option.value}
              value={option.value}
              style={[
                CURRENCY_ROW_STYLE,
                { borderColor: isSelected ? Colors.dark.gold : Colors.dark.border },
              ]}
              className={isSelected ? 'bg-accent/15' : 'bg-surface'}
              accessibilityLabel={resolveCurrencyOptionA11y(option).accessibilityLabel}
            >
              <View
                // Chip fill is a step darker than the row (`--background` vs `--surface`).
                className={
                  isSelected ? 'border-accent bg-accent/15' : 'border-border bg-background'
                }
                style={{
                  width: Size.shieldBox,
                  height: Size.shieldBox,
                  borderWidth: 1,
                  borderRadius: Radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {option.symbol.kind === 'text' ? (
                  <Typography
                    className={cn(
                      'font-sora-bold',
                      isSelected ? 'text-accent' : 'text-content-secondary',
                    )}
                    style={{ fontSize: Type.subhead, lineHeight: lineHeightFor(Type.subhead) }}
                  >
                    {option.symbol.text}
                  </Typography>
                ) : (
                  <MaterialCommunityIcons
                    name={option.symbol.name}
                    size={Size.iconMd}
                    color={isSelected ? Colors.dark.gold : Colors.dark.text2}
                  />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography
                  className="text-foreground font-sora-semibold"
                  style={{ fontSize: Type.subhead, lineHeight: lineHeightFor(Type.subhead) }}
                >
                  {option.label}
                </Typography>
                <Typography
                  className="text-foreground font-inter"
                  style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
                >
                  {option.consequence}
                </Typography>
              </View>
              <Radio />
            </RadioGroup.Item>
          );
        })}
      </RadioGroup>
    </View>
  );
}
