import {
  STATUS_GLYPH_BOX,
  STATUS_IDLE_DOT,
  STATUS_TRACK_LINE_HEIGHT,
  resolveStatusTrack,
} from '@/components/ui/status_track.geometry';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { ms } from '@/utils/responsive';

describe('status track geometry', () => {
  it('holds exactly two status lines at every scale', () => {
    expect(STATUS_TRACK_LINE_HEIGHT * 2).toBeLessThanOrEqual(Size.statusTrack);
    expect(STATUS_TRACK_LINE_HEIGHT * 2).toBeGreaterThan(Size.statusTrack - 2);
  });

  it('keeps the glyph column and the idle dot at their shipped sizes', () => {
    expect(STATUS_GLYPH_BOX).toBe(ms(14));
    expect(STATUS_IDLE_DOT).toBe(ms(5));
  });
});

describe('resolveStatusTrack', () => {
  it.each([
    [
      'idle footnote, no message',
      Strings.n2Footnote,
      undefined,
      {
        text: Strings.n2Footnote,
        tone: 'idle' as const,
        glyph: 'dot' as const,
        a11y: { accessibilityLiveRegion: 'polite' as const },
      },
    ],
    [
      'error message replaces the footnote',
      Strings.n2Footnote,
      'Could not save that.',
      {
        text: 'Could not save that.',
        tone: 'error' as const,
        glyph: 'alert' as const,
        a11y: {
          accessibilityLiveRegion: 'assertive' as const,
          accessibilityRole: 'alert' as const,
        },
      },
    ],
    [
      'an empty string is not a failure, so the footnote stays',
      Strings.n2Footnote,
      '',
      {
        text: Strings.n2Footnote,
        tone: 'idle' as const,
        glyph: 'dot' as const,
        a11y: { accessibilityLiveRegion: 'polite' as const },
      },
    ],
    [
      'no footnote and no message is one empty line with no glyph',
      undefined,
      undefined,
      {
        text: '',
        tone: 'idle' as const,
        glyph: 'none' as const,
        a11y: { accessibilityLiveRegion: 'polite' as const },
      },
    ],
    [
      'a message without a footnote is an alert',
      undefined,
      "Couldn't save this transaction. Nothing was changed. Try again.",
      {
        text: "Couldn't save this transaction. Nothing was changed. Try again.",
        tone: 'error' as const,
        glyph: 'alert' as const,
        a11y: {
          accessibilityLiveRegion: 'assertive' as const,
          accessibilityRole: 'alert' as const,
        },
      },
    ],
  ])('%s', (_name, footnote, message, expected) => {
    expect(resolveStatusTrack(footnote, message)).toEqual(expected);
  });
});
