import React from 'react';
import type { ReactNode } from 'react';

import { FormLabelText } from '@/components/ui/form_label_text';
import { Input } from '@/components/ui/input';
import type { InputRestOverlay } from '@/components/ui/input.geometry';

import { FieldMessageTrack } from '../../../../components/field_message_rail';

// HeroUI's disabled field and suffix halve their opacity; D1's read-only box is surface, separator border and 70% text, fully opaque.
const LOCKED_TEXT_CLASS = 'text-foreground/70';
const LOCKED_FIELD_CLASS = `bg-surface border-separator android:border-separator ${LOCKED_TEXT_CLASS} disabled:opacity-100`;
const LOCKED_REST_VALUE_CLASS = `font-inter ${LOCKED_TEXT_CLASS}`;
const LOCKED_SUFFIX_CLASS = 'opacity-100';

interface Props {
  label: string;
  value: string;
  suffix: ReactNode;
  helper?: string;
  /** Above font scale 1: an amount shrinks to fit, a word ends in `…`. */
  valueAtRest?: InputRestOverlay;
}

/** Canvas `.box.ro` (D1, D2): a label, a disabled field and its message track, never editable. */
export function LockedField({
  label,
  value,
  suffix,
  helper,
  valueAtRest = 'ellipsis',
}: Props): React.ReactElement {
  return (
    <>
      <FormLabelText label={label} />
      <Input
        value={value}
        isDisabled
        className={LOCKED_FIELD_CLASS}
        accessibilityLabel={label}
        suffix={suffix}
        suffixClassName={LOCKED_SUFFIX_CLASS}
        valueAtRest={valueAtRest}
        restValueClassName={LOCKED_REST_VALUE_CLASS}
      />
      <FieldMessageTrack helper={helper} />
    </>
  );
}
