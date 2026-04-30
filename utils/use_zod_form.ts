import { useEffect, useRef } from 'react';
import { useForm, type UseFormProps, type FieldValues, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { $ZodType } from 'zod/v4/core';

// Zod v4's ZodType<T> has Input=unknown, but zodResolver requires Input extends FieldValues.
// This local alias keeps the public API simple while allowing the cast inside.
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
    // Cast: schema produces T at runtime; the Input=unknown default is a Zod v4
    // quirk that confuses @hookform/resolvers. We assert Input=T to satisfy the
    // overload while leaving runtime behaviour unchanged.
    resolver: ((values, ctx, opts) =>
      zodResolver(schemaRef.current as unknown as $ZodType<T, T>)(
        values,
        ctx,
        opts,
      )) as Resolver<T>,
    ...options,
  });
}
