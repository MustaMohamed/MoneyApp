import React from 'react';
import type { ReactNode } from 'react';

import { FormLabelText } from '@/components/ui/form_label_text';
import { Input } from '@/components/ui/input';

import { FieldMessageTrack } from '../../../../components/account_form/field_message_rail';

// HeroUI's disabled field only halves its opacity; D1's read-only box is surface, separator border and 70% text, fully opaque.
const LOCKED_FIELD_CLASS =
  'bg-surface border-separator android:border-separator text-foreground/70 disabled:opacity-100';

interface Props {
  label: string;
  value: string;
  suffix: ReactNode;
  helper?: string;
}

/** Canvas `.box.ro` (D1, D2): a label, a disabled field and its message track, never editable. */
export function LockedField({ label, value, suffix, helper }: Props): React.ReactElement {
  return (
    <>
      <FormLabelText label={label} />
      <Input
        value={value}
        isDisabled
        className={LOCKED_FIELD_CLASS}
        accessibilityLabel={label}
        suffix={suffix}
      />
      <FieldMessageTrack helper={helper} />
    </>
  );
}
