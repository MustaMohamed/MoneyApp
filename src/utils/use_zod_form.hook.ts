import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import {
  useForm,
  type FieldValues,
  type Path,
  type PathValue,
  type Resolver,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form';
import type { $ZodType } from 'zod/v4/core';

import { isStillTypingDecimal } from '@/utils/parse_decimal';

// Zod v4's `ZodType<T>` has Input=unknown, but `zodResolver` requires Input extends FieldValues.
type ZodSchema<T> = $ZodType<T, unknown>;

export function useZodForm<T extends FieldValues>(
  schema: ZodSchema<T>,
  options?: Omit<UseFormProps<T>, 'resolver'>,
) {
  const schemaRef = useRef(schema);
  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  return useForm<T>({
    resolver: ((values, ctx, opts) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Zod v4 uses Input=unknown by default; double-cast bridges the @hookform/resolvers overload gap without changing runtime behaviour
      const schema = schemaRef.current as unknown as $ZodType<T, T>;
      return zodResolver(schema)(values, ctx, opts);
    }) as Resolver<T>,
    ...options,
  });
}

/** Stores a still-typing keystroke unvalidated and clears that field's fault; `false` writes nothing. */
export function holdStillTypingDecimal<T extends FieldValues, N extends Path<T>>(
  form: Pick<UseFormReturn<T>, 'setValue' | 'clearErrors'>,
  name: N,
  value: PathValue<T, N>,
  refusesZero: boolean,
  // A field that stores no text must pass the typed text; a text field may leave it out.
  ...[text]: PathValue<T, N> extends string | undefined ? [text?: string] : [text: string]
): boolean {
  const typed: unknown = text ?? value;
  if (typeof typed !== 'string' || !isStillTypingDecimal(typed, refusesZero)) return false;
  form.setValue(name, value, { shouldDirty: true });
  form.clearErrors(name);
  return true;
}

/** Holds a still-typing text; otherwise stores it and, once submitted, validates that field. */
export function setTypedDecimal<T extends FieldValues, N extends Path<T>>(
  form: Pick<UseFormReturn<T>, 'setValue' | 'clearErrors' | 'getValues' | 'trigger'>,
  name: N,
  text: PathValue<T, N> & string,
  refusesZero: boolean,
  isSubmitted: boolean,
): void {
  // `text` twice: the hold's last parameter stays unresolved while `T` is generic.
  if (holdStillTypingDecimal(form, name, text, refusesZero, text)) return;
  form.setValue(name, text, { shouldDirty: true });
  if (!isSubmitted) return;
  void form.trigger(name).then(() => {
    // A later held keystroke cleared the fault; this result is for the text before it.
    const current: unknown = form.getValues(name);
    if (typeof current === 'string' && isStillTypingDecimal(current, refusesZero)) {
      form.clearErrors(name);
    }
  });
}
