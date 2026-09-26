import { Size } from '@/constants/theme';
import { ms } from '@/utils/responsive';

/** Derived from the track so two lines fit: at scale 1.15, ms(34) = 39 but 2 * ms(17) = 40. */
export const STATUS_TRACK_LINE_HEIGHT = Math.floor(Size.statusTrack / 2);

/** Glyph column from mockup.html:330-332 at 14; both states share it so the text edge holds. */
export const STATUS_GLYPH_BOX = ms(14);
export const STATUS_IDLE_DOT = ms(5);

export type StatusTone = 'idle' | 'error';

export interface StatusTrackModel {
  text: string;
  tone: StatusTone;
  glyph: 'alert' | 'dot' | 'none';
  a11y: { accessibilityLiveRegion: 'polite' | 'assertive'; accessibilityRole?: 'alert' };
}

/** An empty `message` is the absence of an error; with no footnote either, the track is one empty line. */
export function resolveStatusTrack(
  footnote: string | undefined,
  message?: string,
): StatusTrackModel {
  if (message) {
    return {
      text: message,
      tone: 'error',
      glyph: 'alert',
      a11y: { accessibilityLiveRegion: 'assertive', accessibilityRole: 'alert' },
    };
  }

  return {
    text: footnote ?? '',
    tone: 'idle',
    glyph: footnote ? 'dot' : 'none',
    a11y: { accessibilityLiveRegion: 'polite' },
  };
}
