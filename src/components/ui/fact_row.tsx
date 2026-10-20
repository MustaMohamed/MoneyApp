import { ListGroup, cn } from 'heroui-native';
import type { ReactElement, ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

import {
  FACT_ROW_FONT_SIZE,
  FACT_ROW_VALUE_GAP,
  type FactRowShape,
  resolveFactRowFlex,
  resolveFactRowGeometry,
  resolveFactRowValueTextProps,
} from '@/components/ui/fact_row.geometry';
import { resolveOneLineTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';

const VALUE_CLASS_NAMES = {
  sora: 'font-sora text-foreground tabular-nums',
  inter: 'font-inter text-foreground',
} as const;

export interface FactRowPress {
  onPress?: () => void;
  disabled: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export interface FactRowProps {
  label: string;
  value?: string;
  valueFace?: 'sora' | 'inter';
  /** Runtime hex from a token; `className` is build-time only. */
  valueColor?: string;
  valueClassName?: string;
  valueFontSize?: number;
  fitsValue?: boolean;
  /** An amount or a count: its label gives way first. */
  holdsAmount?: boolean;
  wrapsValue?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  labelCaption?: ReactNode;
  /** Takes the value's place; the row then roots on a plain view, so a field keeps its own touch. */
  children?: ReactNode;
  showDivider?: boolean;
  inset?: boolean;
  testID?: string;
  press?: FactRowPress;
}

/** Canvas `.fact`: the label left and the value right at the shared row height; an amount or a count shows every digit and its label gives way first. */
export function FactRow({
  label,
  value,
  valueFace = 'sora',
  valueColor,
  valueClassName,
  valueFontSize = FACT_ROW_FONT_SIZE,
  fitsValue = false,
  holdsAmount = false,
  wrapsValue = false,
  leading,
  trailing,
  labelCaption,
  children,
  showDivider = true,
  inset = true,
  testID,
  press,
}: FactRowProps): ReactElement {
  const { fontScale } = useWindowDimensions();
  const shape: FactRowShape = {
    fitsValue,
    holdsAmount,
    hasCaption: labelCaption !== undefined,
    wrapsValue,
    holdsField: children !== undefined,
  };
  const geometry = resolveFactRowGeometry(shape, fontScale);
  const flex = resolveFactRowFlex(geometry.labelGivesWay);
  const labelText = resolveOneLineTextProps(scaledTextStyle(FACT_ROW_FONT_SIZE, fontScale));
  const valueText = resolveFactRowValueTextProps(shape, valueFontSize, fontScale);
  // `py-0`: HeroUI's own 16 dp item padding would cut every text in a 44 dp row.
  const className = cn(
    'gap-3 py-0',
    inset ? 'px-4' : 'px-0',
    showDivider && 'border-separator border-b',
  );
  const style = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: geometry.height,
    minHeight: geometry.minHeight,
    paddingVertical: geometry.paddingVertical,
  } as const;

  const labelNode = (
    <ListGroup.ItemDescription
      {...labelText}
      className="font-inter text-content-secondary"
      style={[labelText.style, labelCaption === undefined ? flex.label : undefined]}
    >
      {label}
    </ListGroup.ItemDescription>
  );
  const content = (
    <>
      {labelCaption === undefined ? (
        labelNode
      ) : (
        <View style={flex.label}>
          {labelNode}
          {labelCaption}
        </View>
      )}
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: FACT_ROW_VALUE_GAP,
          },
          flex.group,
        ]}
      >
        {leading}
        {children ??
          (value === undefined ? null : (
            <ListGroup.ItemTitle
              {...valueText}
              className={cn(VALUE_CLASS_NAMES[valueFace], valueClassName)}
              style={[
                valueText.style,
                { flexShrink: 1, textAlign: 'right' },
                valueColor === undefined ? undefined : { color: valueColor },
              ]}
            >
              {value}
            </ListGroup.ItemTitle>
          ))}
        {trailing}
      </View>
    </>
  );

  if (children !== undefined) {
    return (
      <View testID={testID} className={className} style={style}>
        {content}
      </View>
    );
  }
  return (
    <ListGroup.Item
      testID={testID}
      className={className}
      style={style}
      onPress={press === undefined || press.disabled ? undefined : press.onPress}
      disabled={press?.disabled}
      accessibilityRole={press === undefined ? undefined : 'button'}
      accessibilityLabel={press?.accessibilityLabel}
      accessibilityHint={press?.accessibilityHint}
      accessibilityState={press === undefined ? undefined : { disabled: press.disabled }}
    >
      {content}
    </ListGroup.Item>
  );
}
