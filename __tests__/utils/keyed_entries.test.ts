import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';

interface Entry {
  value: number;
}

const stateOf = (entries: Record<string, Entry>): KeyedEntries<Entry> => ({ entries });

describe('withEntry', () => {
  it('creates the entry for an owner that has none', () => {
    const before = stateOf({});

    const after = withEntry(before, 'owner-a', { value: 1 });

    expect(after.entries).toEqual({ 'owner-a': { value: 1 } });
  });

  it('replaces only that owner entry', () => {
    const kept = { value: 1 };
    const before = stateOf({ 'owner-a': kept, 'owner-b': { value: 2 } });

    const after = withEntry(before, 'owner-b', { value: 3 });

    expect(after.entries['owner-a']).toBe(kept);
    expect(after.entries['owner-b']).toEqual({ value: 3 });
  });

  it('leaves the state it was given untouched', () => {
    const before = stateOf({ 'owner-a': { value: 1 } });

    withEntry(before, 'owner-b', { value: 2 });

    expect(before.entries).toEqual({ 'owner-a': { value: 1 } });
  });
});

describe('withoutEntry', () => {
  it('drops only the named owner', () => {
    const kept = { value: 1 };
    const before = stateOf({ 'owner-a': kept, 'owner-b': { value: 2 } });

    const after = withoutEntry(before, 'owner-b');

    expect(Object.keys(after.entries)).toEqual(['owner-a']);
    expect(after.entries['owner-a']).toBe(kept);
  });

  it('returns the same state object when the owner is absent', () => {
    const before = stateOf({ 'owner-a': { value: 1 } });

    expect(withoutEntry(before, 'owner-b')).toBe(before);
  });

  it('returns the same state object when there are no entries at all', () => {
    const before = stateOf({});

    expect(withoutEntry(before, 'owner-a')).toBe(before);
  });

  it('leaves the state it was given untouched', () => {
    const before = stateOf({ 'owner-a': { value: 1 }, 'owner-b': { value: 2 } });

    withoutEntry(before, 'owner-b');

    expect(Object.keys(before.entries)).toEqual(['owner-a', 'owner-b']);
  });
});
