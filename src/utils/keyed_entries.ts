/** State keyed by a per-mount owner, so two mounted copies of one screen cannot clobber each other. */
export interface KeyedEntries<TEntry> {
  entries: Record<string, TEntry>;
}

export function withEntry<TEntry>(
  state: KeyedEntries<TEntry>,
  owner: string,
  entry: TEntry,
): KeyedEntries<TEntry> {
  return { entries: { ...state.entries, [owner]: entry } };
}

/** Returns the same state when the owner is absent, so a sibling copy's `useShallow` read does not re-render. */
export function withoutEntry<TEntry>(
  state: KeyedEntries<TEntry>,
  owner: string,
): KeyedEntries<TEntry> {
  if (!(owner in state.entries)) return state;
  const entries = { ...state.entries };
  delete entries[owner];
  return { entries };
}
