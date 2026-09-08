import { ListGroup } from 'heroui-native';
import React from 'react';

import { TouchSize, Type, lineHeightFor } from '@/constants/theme';

interface Props {
  label: string;
  value: string;
  /** Runtime hex from a token; `className` is build-time only (the month figures). */
  valueColor?: string;
  showDivider?: boolean;
}

/** Canvas `.fact` (C1, C2b): label left, value right, one line, at the 44 touch floor. */
export function AccountFactRow({
  label,
  value,
  valueColor,
  showDivider = true,
}: Props): React.ReactElement {
  return (
    <ListGroup.Item
      className={`flex-row items-center justify-between gap-3 px-4 py-2 ${showDivider ? 'border-separator border-b' : ''}`}
      style={{ minHeight: TouchSize.min }}
    >
      <ListGroup.ItemDescription
        className="font-inter text-content-secondary"
        style={{ flexShrink: 1, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
      >
        {label}
      </ListGroup.ItemDescription>
      <ListGroup.ItemTitle
        className="font-inter-medium text-foreground"
        style={[
          { fontSize: Type.body, lineHeight: lineHeightFor(Type.body) },
          valueColor ? { color: valueColor } : undefined,
        ]}
        numberOfLines={1}
      >
        {value}
      </ListGroup.ItemTitle>
    </ListGroup.Item>
  );
}
