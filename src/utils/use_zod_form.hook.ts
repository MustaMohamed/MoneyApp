import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm, type UseFormProps, type FieldValues, type Resolver } from 'react-hook-form';
import type { $ZodType } from 'zod/v4/core';

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
