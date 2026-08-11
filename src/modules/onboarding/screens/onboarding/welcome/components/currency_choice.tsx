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

/**
 * Block 3 — the two currency radio rows (mockup.html:1053-1069). Selection
 * changes colour only, never the row's own geometry (MA-010 decision D7):
 * `CURRENCY_ROW_STYLE` is shared literally between both states, and the
 * `isSelected` branch below sets only `borderColor` and the fill class.
 */
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
          // RadioGroup is generic over string; every value it can carry here
          // comes from CURRENCY_OPTIONS' own Currency values, so this is sound.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- RadioGroup's onValueChange is (string)=>void; values only ever come from CURRENCY_OPTIONS' Currency entries
          onSelect(value as Currency)
        }
        accessibilityLabel={Strings.n1CurrencyQuestion}
        style={{ gap: Spacing.xs }}
      >
        {CURRENCY_OPTIONS.map((option) => {
          // Computed from this component's own `selected` prop rather than
          // read from the render-prop: RadioGroup.Item's own className/style
          // are fixed at JSX-authoring time, before the render-prop callback
          // ever runs, so the row's own border+fill (as opposed to the
          // symbol chip's, which the children below own) has to be decided
          // out here to reach the Item itself.
          const isSelected = option.value === selected;

          return (
            <RadioGroup.Item
              key={option.value}
              value={option.value}
              style={[
                CURRENCY_ROW_STYLE,
                { borderColor: isSelected ? Colors.dark.gold : Colors.dark.border },
              ]}
              className={cn(isSelected ? 'bg-accent/15' : 'bg-surface')}
              accessibilityLabel={resolveCurrencyOptionA11y(option).accessibilityLabel}
            >
              <View
                className={cn(
                  isSelected ? 'border-accent bg-accent/15' : 'border-border bg-surface',
                )}
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
                {/* Full-strength, not text-content-secondary — MA-010 decision
                    D5. This sentence is what "choosing this currency" means,
                    not a redundant label. */}
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
