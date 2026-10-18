import { ms } from '@/utils/responsive';

/** The rate card's and the rate editor's message slots: a floor and no fixed height, so a message wrapped at a large font scale stays whole. */
export const RATE_MESSAGE_SLOT_STYLE = {
  minHeight: ms(16),
  justifyContent: 'center',
} as const;
