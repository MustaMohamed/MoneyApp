import { act, renderHook } from '@testing-library/react-native';
import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';

import { useRouteDraft } from '@/utils/use_route_draft.hook';

interface Entity {
  id: string;
  name: string;
}

interface Values {
  name: string;
}

interface ProbeProps {
  id: string;
  entities: Entity[];
}

const e1: Entity = { id: 'e-1', name: 'First' };
const e2: Entity = { id: 'e-2', name: 'Second' };

const buildDraft = (entity: Entity): Values => ({ name: entity.name });

const onRedraft = jest.fn();
let busy = false;
let reads: [boolean, boolean][] = [];

function useProbe({ id, entities }: ProbeProps) {
  const entity = entities.find((e) => e.id === id);
  const form = useForm<Values>({ defaultValues: entity ? buildDraft(entity) : undefined });
  const draft = useRouteDraft({ id, entity, form, buildDraft, onRedraft, isBusy: () => busy });
  useLayoutEffect(() => {
    reads.push([draft.isCurrent('e-1'), draft.isCurrent('e-2')]);
  });
  return { form, ...draft };
}

function mount(initialProps: ProbeProps) {
  return renderHook((props: ProbeProps) => useProbe(props), { initialProps });
}

type Probe = Awaited<ReturnType<typeof mount>>;

async function typeName(probe: Probe, name: string) {
  await act(async () => {
    probe.result.current.form.setValue('name', name, { shouldDirty: true });
  });
}

async function rerenderAndRead(probe: Probe, props: ProbeProps) {
  const before = reads.length;
  await probe.rerender(props);
  return reads[before];
}

describe('useRouteDraft', () => {
  beforeEach(() => {
    onRedraft.mockClear();
    busy = false;
    reads = [];
  });

  it('a rerender naming another entity moves the refs inside the commit and drafts it', async () => {
    const probe = await mount({ id: 'e-1', entities: [e1, e2] });
    await typeName(probe, 'Typed');

    const first = await rerenderAndRead(probe, { id: 'e-2', entities: [e1, e2] });

    expect(first).toEqual([false, true]);
    expect(probe.result.current.form.getValues()).toEqual(buildDraft(e2));
    expect(onRedraft).toHaveBeenCalledTimes(1);
  });

  it('a rerender naming an id the entities lack reads no entity as current and keeps the draft', async () => {
    const probe = await mount({ id: 'e-1', entities: [e1, e2] });
    await typeName(probe, 'Typed');

    const first = await rerenderAndRead(probe, { id: 'e-missing', entities: [e1, e2] });

    expect(first).toEqual([false, false]);
    expect(probe.result.current.form.getValues('name')).toBe('Typed');
    expect(onRedraft).not.toHaveBeenCalled();
  });

  it('a new object for the same entity keeps what was typed', async () => {
    const probe = await mount({ id: 'e-1', entities: [e1, e2] });
    await typeName(probe, 'Typed');

    await probe.rerender({ id: 'e-1', entities: [{ ...e1 }, e2] });

    expect(probe.result.current.form.getValues('name')).toBe('Typed');
    expect(onRedraft).not.toHaveBeenCalled();
    expect(probe.result.current.isCurrent('e-1')).toBe(true);
  });

  it('an entity that loads after mount drafts its values', async () => {
    const probe = await mount({ id: 'e-1', entities: [] });

    await probe.rerender({ id: 'e-1', entities: [e1] });

    expect(probe.result.current.form.getValues()).toEqual(buildDraft(e1));
    expect(probe.result.current.isCurrent('e-1')).toBe(true);
  });

  it('a submit while busy neither validates nor marks the form submitted', async () => {
    const probe = await mount({ id: 'e-1', entities: [e1] });
    expect(probe.result.current.form.formState.isSubmitted).toBe(false);
    expect(probe.result.current.form.formState.submitCount).toBe(0);
    const onValid = jest.fn();
    busy = true;

    await act(async () => {
      await probe.result.current.submit(onValid);
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(probe.result.current.form.formState.isSubmitted).toBe(false);
    expect(probe.result.current.form.formState.submitCount).toBe(0);
  });
});
