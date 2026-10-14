import { useLayoutEffect, useRef } from 'react';
import type { FieldValues, SubmitHandler, UseFormReturn } from 'react-hook-form';

interface RouteDraftOptions<TEntity extends { id: string }, TValues extends FieldValues> {
  id: string;
  entity: TEntity | undefined;
  form: UseFormReturn<TValues>;
  buildDraft: (entity: TEntity) => TValues;
  onRedraft: () => void;
  isBusy: () => boolean;
}

export function useRouteDraft<TEntity extends { id: string }, TValues extends FieldValues>({
  id,
  entity,
  form,
  buildDraft,
  onRedraft,
  isBusy,
}: RouteDraftOptions<TEntity, TValues>): {
  isCurrent: (entityId: string) => boolean;
  submit: (onValid: SubmitHandler<TValues>) => Promise<void>;
} {
  // Keyed on the route's id, never the entity: every reload publishes a new object, and a reset on it drops what was typed.
  const routeIdRef = useRef(id);
  const draftedIdRef = useRef<string | undefined>(entity ? id : undefined);

  // A layout effect runs inside the commit, so no tap or late result sees the new route with the old refs.
  useLayoutEffect(() => {
    routeIdRef.current = id;
    if (!entity || draftedIdRef.current === id) return;
    draftedIdRef.current = id;
    form.reset(buildDraft(entity));
    onRedraft();
  }, [id, entity, form, buildDraft, onRedraft]);

  function isCurrent(entityId: string): boolean {
    return routeIdRef.current === entityId && draftedIdRef.current === entityId;
  }

  async function submit(onValid: SubmitHandler<TValues>): Promise<void> {
    if (isBusy()) return;
    const startedOn = draftedIdRef.current;
    await form.handleSubmit(onValid)();
    // `handleSubmit` marks the form submitted after `onValid` returns, so only a reset after it unmarks the next entity.
    if (draftedIdRef.current !== startedOn) {
      form.reset(undefined, {
        keepValues: true,
        keepDefaultValues: true,
        keepDirty: true,
        keepTouched: true,
        keepErrors: true,
      });
    }
  }

  return { isCurrent, submit };
}
