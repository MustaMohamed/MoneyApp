import { SHEET_FOOTER_CLEARANCE, resolveSheetContentPadding } from '@/components/ui/sheet';

const FOOTER_HEIGHT = 106;

const BASE = {
  fitContent: false,
  scrollable: false,
  hasFooter: false,
  liftsAboveKeyboard: false,
  footerHeight: FOOTER_HEIGHT,
};

describe('resolveSheetContentPadding', () => {
  it('pads fitContent content by the measured footer, and by nothing with no footer', () => {
    expect(resolveSheetContentPadding({ ...BASE, fitContent: true, hasFooter: true })).toEqual({
      padding: 0,
      paddingBottom: FOOTER_HEIGHT,
    });
    expect(resolveSheetContentPadding({ ...BASE, fitContent: true, hasFooter: false })).toEqual({
      padding: 0,
      paddingBottom: 0,
    });
  });

  it('ends a lifting, scrollable sheet with a footer at the footer top', () => {
    expect(
      resolveSheetContentPadding({
        ...BASE,
        scrollable: true,
        hasFooter: true,
        liftsAboveKeyboard: true,
      }),
    ).toEqual({ padding: 0, paddingBottom: FOOTER_HEIGHT });
  });

  it('passes the measured footer height through on both padded branches', () => {
    for (const footerHeight of [0, 88.5, 124]) {
      expect(
        resolveSheetContentPadding({ ...BASE, fitContent: true, hasFooter: true, footerHeight }),
      ).toEqual({ padding: 0, paddingBottom: footerHeight });
      expect(
        resolveSheetContentPadding({
          ...BASE,
          scrollable: true,
          hasFooter: true,
          liftsAboveKeyboard: true,
          footerHeight,
        }),
      ).toEqual({ padding: 0, paddingBottom: footerHeight });
    }
  });

  it('MA-163: pads a scrollable sheet with a footer that does not lift by what the footer stands over the static clearance, and adds none at or under it', () => {
    const footed = { ...BASE, scrollable: true, hasFooter: true, liftsAboveKeyboard: false };
    expect(FOOTER_HEIGHT).toBeLessThan(SHEET_FOOTER_CLEARANCE);

    expect(resolveSheetContentPadding(footed)).toStrictEqual({ padding: 0 });
    expect(
      resolveSheetContentPadding({ ...footed, footerHeight: SHEET_FOOTER_CLEARANCE }),
    ).toStrictEqual({ padding: 0 });
    expect(
      resolveSheetContentPadding({ ...footed, footerHeight: SHEET_FOOTER_CLEARANCE + 33 }),
    ).toStrictEqual({ padding: 0, paddingBottom: 33 });
  });

  it('leaves paddingBottom out on every sheet that is neither fitContent nor scrollable with a footer', () => {
    const others = [
      { scrollable: false, hasFooter: false, liftsAboveKeyboard: false },
      { scrollable: true, hasFooter: false, liftsAboveKeyboard: false },
      { scrollable: false, hasFooter: true, liftsAboveKeyboard: false },
      { scrollable: false, hasFooter: false, liftsAboveKeyboard: true },
      { scrollable: true, hasFooter: false, liftsAboveKeyboard: true },
      { scrollable: false, hasFooter: true, liftsAboveKeyboard: true },
    ];
    for (const flags of others) {
      expect(resolveSheetContentPadding({ ...BASE, ...flags })).toStrictEqual({ padding: 0 });
    }
  });
});
