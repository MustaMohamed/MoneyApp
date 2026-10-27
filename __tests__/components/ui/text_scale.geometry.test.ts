import { PixelRatio } from 'react-native';

import {
  FITTED_LINE_SLACK,
  OPENING_LETTERS_EM,
  resolveFitAmountTextProps,
  resolveFitLineTextProps,
  resolveLoneWordLines,
  resolveMessageGlyphShift,
  resolveKeptSpaceHeight,
  resolveOneLineTextProps,
  resolveOpeningLettersMinWidth,
  resolveRowStacking,
  resolveUncappedLinesAboveOne,
  resolveWordSafeLines,
  scaledFontSize,
  scaledLineHeight,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Type, lineHeightFor } from '@/constants/theme';

describe('FITTED_LINE_SLACK', () => {
  it('MA-162: is one device pixel, in dp', () => {
    expect(FITTED_LINE_SLACK * PixelRatio.get()).toBe(1);
  });
});

describe('scaledFontSize', () => {
  it('follows the font scale up to its cap', () => {
    expect(scaledFontSize(Type.overline, 1)).toBe(Type.overline);
    expect(scaledFontSize(Type.overline, 2)).toBe(Type.overline * 2);
    expect(scaledFontSize(Type.overline, 2, 1.3)).toBe(Type.overline * 1.3);
  });
});

describe('scaledLineHeight (MA-234)', () => {
  it.each([0.85, 1, 1.3, 2])('is the line box of the scaled size at font scale %s', (fontScale) => {
    for (const fontSize of [Type.micro, Type.caption, Type.bodyStrong, Type.headline]) {
      expect(scaledLineHeight(fontSize, fontScale)).toBe(
        lineHeightFor(scaledFontSize(fontSize, fontScale)),
      );
    }
  });

  it.each([1.3, 2])('stops at its cap at font scale %s', (fontScale) => {
    expect(scaledLineHeight(Type.chip, fontScale, 1.3)).toBe(
      lineHeightFor(scaledFontSize(Type.chip, 1.3)),
    );
  });

  it('is the line height scaledTextStyle pairs with the same size', () => {
    expect(scaledLineHeight(Type.micro, 2, 1.3)).toBe(
      scaledTextStyle(Type.micro, 2, 1.3).lineHeight,
    );
  });
});

describe('resolveKeptSpaceHeight (MA-234)', () => {
  const HEIGHT_AT_ONE = 60;
  const linesAt = (fontScale: number): number => 10.25 * fontScale;

  it.each([0.85, 1])('keeps the 1.0 height at font scale %s', (fontScale) => {
    expect(resolveKeptSpaceHeight(HEIGHT_AT_ONE, linesAt, fontScale)).toBe(HEIGHT_AT_ONE);
  });

  it.each([1.3, 2])('adds the lines grown past 1.0, unrounded, at font scale %s', (fontScale) => {
    expect(resolveKeptSpaceHeight(HEIGHT_AT_ONE, linesAt, fontScale)).toBe(
      HEIGHT_AT_ONE + linesAt(fontScale) - linesAt(1),
    );
  });

  it('keeps the 1.0 height when the lines shrink above 1.0', () => {
    expect(resolveKeptSpaceHeight(HEIGHT_AT_ONE, (fontScale: number) => 20 - fontScale, 2)).toBe(
      HEIGHT_AT_ONE,
    );
  });
});

describe('resolveOneLineTextProps', () => {
  it('with no scaled style leaves the size to the OS and only lets the line shrink', () => {
    expect(resolveOneLineTextProps(undefined)).toEqual({
      numberOfLines: 1,
      allowFontScaling: true,
      style: { flexShrink: 1 },
    });
  });

  it('with a scaled style stops OS scaling and keeps that style plus a shrink', () => {
    const scaled = scaledTextStyle(Type.caption, 2);
    expect(resolveOneLineTextProps(scaled)).toEqual({
      numberOfLines: 1,
      allowFontScaling: false,
      style: { ...scaled, flexShrink: 1 },
    });
  });
});

describe('resolveRowStacking', () => {
  it('keeps a row at font scale 1 and below', () => {
    expect(resolveRowStacking(0.85)).toBe('row');
    expect(resolveRowStacking(1)).toBe('row');
  });

  it('stacks above font scale 1', () => {
    expect(resolveRowStacking(1.01)).toBe('stacked');
    expect(resolveRowStacking(2)).toBe('stacked');
  });
});

describe('resolveLoneWordLines', () => {
  it('gives a lone word one line above a font scale of 1', () => {
    expect(resolveLoneWordLines('Housing', 2, 2)).toBe(1);
    expect(resolveLoneWordLines('Housing', 2, 1.15)).toBe(1);
  });

  it('reads a word with space around it as a lone word', () => {
    expect(resolveLoneWordLines(' Subscriptions ', 2, 2)).toBe(1);
  });

  it('keeps the line cap of the caller for a text of several words', () => {
    expect(resolveLoneWordLines('Health & Fitness', 2, 2)).toBe(2);
    expect(resolveLoneWordLines('Health & Fitness', 3, 2)).toBe(3);
  });

  it('keeps the line cap of the caller for a lone word at a font scale of 1', () => {
    expect(resolveLoneWordLines('Housing', 2, 1)).toBe(2);
  });

  it('MA-171: with no cap gives a lone word one line and leaves a text of several words uncapped', () => {
    expect(resolveLoneWordLines('Housing', undefined, 2)).toBe(1);
    expect(resolveLoneWordLines('Health & Fitness', undefined, 2)).toBeUndefined();
  });
});

describe('resolveWordSafeLines', () => {
  it('MA-171: gives the line where a word runs on to the next line', () => {
    expect(resolveWordSafeLines(['Entertainm', 'ent subscri'], 2)).toBe(1);
    expect(resolveWordSafeLines(['Food & ', 'Entertainm', 'ent'], 3)).toBe(2);
  });

  it('MA-171: gives the cap when the word runs on from the line of the cap', () => {
    expect(resolveWordSafeLines(['Food & ', 'Entertainm', 'ent'], 2)).toBe(2);
  });

  it('MA-171: keeps the cap of the caller when a line ends in a space', () => {
    expect(resolveWordSafeLines(['Food & ', 'Dining'], 2)).toBe(2);
  });

  it('MA-171: keeps the cap of the caller when a line ends in a hyphen', () => {
    expect(resolveWordSafeLines(['Self-', 'care budget'], 2)).toBe(2);
  });

  it('MA-171: keeps the cap of the caller when no line is laid out', () => {
    expect(resolveWordSafeLines([], 2)).toBe(2);
  });

  it('MA-171: with no cap gives the first line of a word that runs over three lines', () => {
    expect(resolveWordSafeLines(['Entertainme', 'nt subscript', 'ions'], undefined)).toBe(1);
  });

  it('MA-171: with no cap stays uncapped when every break falls between words', () => {
    expect(resolveWordSafeLines(['Food & ', 'Dining'], undefined)).toBeUndefined();
  });

  it('MA-171: reads an apostrophe on either side of a break as part of the word', () => {
    expect(resolveWordSafeLines(["Children'", 's activities'], 2)).toBe(1);
    expect(resolveWordSafeLines(['Children', "'s activities"], 2)).toBe(1);
  });
});

describe('resolveUncappedLinesAboveOne', () => {
  it('MA-171: keeps the cap of the caller at font scale 1 and gives none above it', () => {
    expect(resolveUncappedLinesAboveOne(2, 1)).toBe(2);
    expect(resolveUncappedLinesAboveOne(2, 1.3)).toBeUndefined();
    expect(resolveUncappedLinesAboveOne(1, 2)).toBeUndefined();
  });
});

describe('resolveFitAmountTextProps', () => {
  it('at font scale 1 holds one line at its own size that does not shrink', () => {
    expect(resolveFitAmountTextProps(Type.title, 1)).toEqual({
      numberOfLines: 1,
      allowFontScaling: false,
      adjustsFontSizeToFit: false,
      style: scaledTextStyle(Type.title, 1),
    });
  });

  it('at font scale 2 holds one line at twice the size that shrinks to fit', () => {
    expect(resolveFitAmountTextProps(Type.title, 2)).toEqual({
      numberOfLines: 1,
      allowFontScaling: false,
      adjustsFontSizeToFit: true,
      style: scaledTextStyle(Type.title, 2),
    });
  });
});

describe('resolveFitLineTextProps (MA-243)', () => {
  it.each([0.85, 1])(
    'at font scale %s holds one line at its scaled size that does not shrink',
    (s) => {
      const props = resolveFitLineTextProps(Type.micro, s);
      expect(props).toEqual({
        numberOfLines: 1,
        allowFontScaling: false,
        adjustsFontSizeToFit: false,
        minimumFontScale: undefined,
        style: scaledTextStyle(Type.micro, s),
      });
      expect(props.minimumFontScale).toBeUndefined();
    },
  );

  it.each([1.3, 2])(
    'at font scale %s holds one line that shrinks to fit, floored at 1 / scale',
    (s) => {
      const props = resolveFitLineTextProps(Type.micro, s);
      expect(props).toEqual({
        numberOfLines: 1,
        allowFontScaling: false,
        adjustsFontSizeToFit: true,
        minimumFontScale: 1 / s,
        style: scaledTextStyle(Type.micro, s),
      });
    },
  );

  it.each([1.3, 2])('at font scale %s never shrinks below its 1.0 size', (s) => {
    const props = resolveFitLineTextProps(Type.micro, s);
    expect(props.style.fontSize * (props.minimumFontScale ?? Number.NaN)).toBeCloseTo(
      Type.micro,
      6,
    );
  });
});

describe('resolveMessageGlyphShift', () => {
  it('MA-184: at font scale 1 keeps the glyph where it sits, whatever the drawn line', () => {
    expect(resolveMessageGlyphShift(20, 20.19, 1)).toBe(0);
  });

  it('MA-184: at font scale 2 keeps the glyph where it sits until a first line is measured', () => {
    expect(resolveMessageGlyphShift(20, undefined, 2)).toBe(0);
  });

  it('MA-184: at font scale 2 moves the glyph down by half the growth of the drawn first line', () => {
    expect(resolveMessageGlyphShift(20, 34.29, 2)).toBeCloseTo(7.145, 6);
  });

  it('MA-184: at font scale 0.85 moves the glyph up by half the shrink of the drawn first line', () => {
    expect(resolveMessageGlyphShift(20, 17.14, 0.85)).toBeCloseTo(-1.43, 6);
  });
});

describe('resolveOpeningLettersMinWidth (MA-263)', () => {
  it.each([1, 0.85])('is undefined at font scale %d', (fontScale) => {
    expect(resolveOpeningLettersMinWidth(Type.bodyStrong, fontScale)).toBeUndefined();
  });

  it.each([1.3, 2])(
    'is the scaled size times the opening-letters em at font scale %d',
    (fontScale) => {
      expect(resolveOpeningLettersMinWidth(Type.bodyStrong, fontScale)).toBe(
        scaledFontSize(Type.bodyStrong, fontScale) * OPENING_LETTERS_EM,
      );
    },
  );
});
