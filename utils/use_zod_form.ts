import { useEffect, useRef } from 'react'
import { useForm, type UseFormProps, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type ZodType } from 'zod'

export function useZodForm<T extends FieldValues>(
  schema: ZodType<T>,
  options?: Omit<UseFormProps<T>, 'resolver'>,
) {
  const schemaRef = useRef(schema)
  useEffect(() => {
    schemaRef.current = schema
  }, [schema])

  return useForm<T>({
    resolver: (values, ctx, opts) => zodResolver(schemaRef.current)(values, ctx, opts),
    ...options,
  })
}
