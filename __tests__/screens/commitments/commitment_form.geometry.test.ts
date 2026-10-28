import {
  PILL_BORDER_WIDTH,
  SELECTABLE_PILL_BARE_HEIGHT,
  SELECTABLE_PILL_LABEL_FONT_SIZE,
  SELECTABLE_PILL_PADDING_BLOCK,
} from '@/components/ui/chip.geometry';
import { lineHeightFor, touchFloorHitSlop } from '@/constants/theme';
import {
  COMMITMENT_FORM_PICKER_GAP,
  COMMITMENT_FORM_PILL_SLOP,
  resolvePeriodRowTopRoom,
} from '@/modules/commitments/screens/commitments/components/commitment_form.geometry';

describe('COMMITMENT_FORM_PILL_SLOP', () => {
  it('MA-236: lifts the bare pill height from chip.geometry to the floor, at the value the form ships today', () => {
    expect(COMMITMENT_FORM_PILL_SLOP).toEqual(touchFloorHitSlop(SELECTABLE_PILL_BARE_HEIGHT));
    expect(COMMITMENT_FORM_PILL_SLOP).toEqual(
      touchFloorHitSlop(
        lineHeightFor(SELECTABLE_PILL_LABEL_FONT_SIZE) +
          2 * SELECTABLE_PILL_PADDING_BLOCK +
          2 * PILL_BORDER_WIDTH,
      ),
    );
  });
});

describe('resolvePeriodRowTopRoom', () => {
  const presetsRowBottom = 33;
  const customRowTop = 41;
  const inputLineBottom = 48;

  it('MA-236: before every row lays out, the period row takes half the picker gap', () => {
    expect(resolvePeriodRowTopRoom(undefined, customRowTop, inputLineBottom, 0)).toBe(
      COMMITMENT_FORM_PICKER_GAP / 2,
    );
    expect(resolvePeriodRowTopRoom(presetsRowBottom, customRowTop, undefined, 0)).toBe(
      COMMITMENT_FORM_PICKER_GAP / 2,
    );
  });

  it('MA-236: a period row wrapped at or below the input line takes half the gap to the input', () => {
    expect(
      resolvePeriodRowTopRoom(presetsRowBottom, customRowTop, inputLineBottom, inputLineBottom + 8),
    ).toBe(COMMITMENT_FORM_PICKER_GAP / 2);
    expect(
      resolvePeriodRowTopRoom(presetsRowBottom, customRowTop, inputLineBottom, inputLineBottom),
    ).toBe(COMMITMENT_FORM_PICKER_GAP / 2);
  });

  it('MA-236: a period row centred on the input line takes half the drawn distance to the presets', () => {
    expect(resolvePeriodRowTopRoom(presetsRowBottom, customRowTop, inputLineBottom, 11.24)).toBe(
      (customRowTop + 11.24 - presetsRowBottom) / 2,
    );
  });
});
