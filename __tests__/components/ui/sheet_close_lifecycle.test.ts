import {
  createSheetCloseLifecycle,
  isSheetClosePending,
  settleSheetCloseLifecycle,
  syncSheetCloseLifecycle,
} from '@/components/ui/sheet_close_lifecycle';

describe('sheet close lifecycle', () => {
  it('completes once after an opened sheet settles closed', () => {
    let lifecycle = createSheetCloseLifecycle(false);
    lifecycle = syncSheetCloseLifecycle(lifecycle, true);
    lifecycle = syncSheetCloseLifecycle(lifecycle, false);

    const first = settleSheetCloseLifecycle(lifecycle, -1);
    const duplicate = settleSheetCloseLifecycle(first.lifecycle, -1);

    expect(first.shouldComplete).toBe(true);
    expect(duplicate.shouldComplete).toBe(false);
  });

  it('ignores a stale close event after the sheet reopens', () => {
    let lifecycle = createSheetCloseLifecycle(true);
    lifecycle = syncSheetCloseLifecycle(lifecycle, false);
    lifecycle = syncSheetCloseLifecycle(lifecycle, true);

    const staleClose = settleSheetCloseLifecycle(lifecycle, -1);

    expect(staleClose.shouldComplete).toBe(false);
    const currentClose = settleSheetCloseLifecycle(
      syncSheetCloseLifecycle(staleClose.lifecycle, false),
      -1,
    );
    expect(currentClose.shouldComplete).toBe(true);
  });

  it('remembers a closed position reported while open, and completes once after the flag drops', () => {
    const opened = syncSheetCloseLifecycle(createSheetCloseLifecycle(false), true);
    const reportedOpen = settleSheetCloseLifecycle(opened, 0);
    expect(reportedOpen.shouldComplete).toBe(false);
    expect(reportedOpen.lifecycle).toMatchObject({ openReported: true, restsClosed: false });

    const early = settleSheetCloseLifecycle(reportedOpen.lifecycle, -1);
    expect(early.shouldComplete).toBe(false);
    expect(early.lifecycle.restsClosed).toBe(true);

    const dropped = syncSheetCloseLifecycle(early.lifecycle, false);
    expect(dropped.restsClosed).toBe(true);

    const settled = settleSheetCloseLifecycle(dropped, -1);
    expect(settled.shouldComplete).toBe(true);
    expect(settled.lifecycle).toMatchObject({ openReported: false, restsClosed: false });
    expect(settleSheetCloseLifecycle(settled.lifecycle, -1).shouldComplete).toBe(false);
  });

  it('clears the remembered closed position when an index of 0 follows it', () => {
    const opened = syncSheetCloseLifecycle(createSheetCloseLifecycle(false), true);
    const reportedOpen = settleSheetCloseLifecycle(opened, 0).lifecycle;
    const early = settleSheetCloseLifecycle(reportedOpen, -1).lifecycle;
    expect(early.restsClosed).toBe(true);

    const backOpen = settleSheetCloseLifecycle(early, 0);

    expect(backOpen.shouldComplete).toBe(false);
    expect(backOpen.lifecycle).toMatchObject({ openReported: true, restsClosed: false });
    expect(syncSheetCloseLifecycle(backOpen.lifecycle, false).restsClosed).toBe(false);
  });

  it('keeps a -1 stale on a reopened lifecycle with no index reported since the reopen', () => {
    const reportedOpen = settleSheetCloseLifecycle(createSheetCloseLifecycle(true), 0).lifecycle;
    const reopened = syncSheetCloseLifecycle(syncSheetCloseLifecycle(reportedOpen, false), true);
    expect(reopened).toMatchObject({ openReported: false, restsClosed: false });

    const staleClose = settleSheetCloseLifecycle(reopened, -1);

    expect(staleClose.shouldComplete).toBe(false);
    expect(staleClose.lifecycle.restsClosed).toBe(false);
    const currentClose = settleSheetCloseLifecycle(
      syncSheetCloseLifecycle(staleClose.lifecycle, false),
      -1,
    );
    expect(currentClose.shouldComplete).toBe(true);
  });
});

describe('isSheetClosePending (MA-244)', () => {
  it('reads false for a sheet that never opened', () => {
    expect(isSheetClosePending(createSheetCloseLifecycle(false))).toBe(false);
    expect(
      isSheetClosePending(syncSheetCloseLifecycle(createSheetCloseLifecycle(false), false)),
    ).toBe(false);
  });

  it('reads false for an open sheet, its open reported or not', () => {
    const opened = syncSheetCloseLifecycle(createSheetCloseLifecycle(false), true);
    expect(isSheetClosePending(opened)).toBe(false);
    expect(isSheetClosePending(settleSheetCloseLifecycle(opened, 0).lifecycle)).toBe(false);
  });

  it('reads true once the open flag drops and no -1 has settled the close', () => {
    const reportedOpen = settleSheetCloseLifecycle(createSheetCloseLifecycle(true), 0).lifecycle;
    const dropped = syncSheetCloseLifecycle(reportedOpen, false);

    expect(isSheetClosePending(dropped)).toBe(true);
    expect(isSheetClosePending(settleSheetCloseLifecycle(dropped, 0).lifecycle)).toBe(true);
  });

  it('reads false once the -1 completes the close', () => {
    const dropped = syncSheetCloseLifecycle(createSheetCloseLifecycle(true), false);
    const completed = settleSheetCloseLifecycle(dropped, -1);

    expect(completed.shouldComplete).toBe(true);
    expect(isSheetClosePending(completed.lifecycle)).toBe(false);
  });
});
