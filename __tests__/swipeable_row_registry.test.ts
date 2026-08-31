import {
  closeRow,
  closeAllRows,
  openRow,
  subscribeToRegistry,
} from '@/utils/swipeable_row_registry';

beforeEach(() => {
  closeAllRows();
});

describe('swipeable_row_registry', () => {
  it('openRow sets the active id', () => {
    let captured: string | null = 'SENTINEL';
    const unsub = subscribeToRegistry((id) => {
      captured = id;
    });
    openRow('row-1');
    expect(captured).toBe('row-1');
    unsub();
  });

  it('opening a second row notifies subscribers with the new id', () => {
    const ids: (string | null)[] = [];
    const unsub = subscribeToRegistry((id) => ids.push(id));
    openRow('row-1');
    openRow('row-2');
    expect(ids).toEqual(['row-1', 'row-2']);
    unsub();
  });

  it('closeRow with the active id notifies subscribers with null', () => {
    let captured: string | null = 'SENTINEL';
    const unsub = subscribeToRegistry((id) => {
      captured = id;
    });
    openRow('row-1');
    captured = 'SENTINEL';
    closeRow('row-1');
    expect(captured).toBeNull();
    unsub();
  });

  it('closeRow with a non-active id is a no-op (no notification)', () => {
    openRow('row-1');
    let notified = false;
    const unsub = subscribeToRegistry(() => {
      notified = true;
    });
    closeRow('row-2');
    expect(notified).toBe(false);
    unsub();
  });

  it('closeAllRows sets active id to null and notifies', () => {
    openRow('row-1');
    let captured: string | null = 'SENTINEL';
    const unsub = subscribeToRegistry((id) => {
      captured = id;
    });
    closeAllRows();
    expect(captured).toBeNull();
    unsub();
  });

  it('unsubscribe prevents further notifications', () => {
    const ids: (string | null)[] = [];
    const unsub = subscribeToRegistry((id) => ids.push(id));
    openRow('row-1');
    unsub();
    openRow('row-2');
    expect(ids).toEqual(['row-1']);
  });

  it('multiple subscribers each receive notifications', () => {
    const a: (string | null)[] = [];
    const b: (string | null)[] = [];
    const unsubA = subscribeToRegistry((id) => a.push(id));
    const unsubB = subscribeToRegistry((id) => b.push(id));
    openRow('row-x');
    unsubA();
    unsubB();
    expect(a).toEqual(['row-x']);
    expect(b).toEqual(['row-x']);
  });
});
