import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, TouchSize } from '@/constants/theme';
import {
  ACCOUNT_TYPE_TILE_HEIGHT,
  chunkTypeOptions,
  CREDIT_SLOT_MIN_HEIGHT,
  CURRENCY_CELL_WIDTH,
  CURRENCY_SEGMENT_WIDTH,
  FIELD_MESSAGE_RAIL_STYLE,
  resolveBalanceField,
} from '@/modules/accounts/components/account_form/account_form.geometry';
import { TYPE_OPTIONS } from '@/modules/accounts/components/account_type_pill';

// Under jest-expo, `Dimensions` is mocked at 750pt, so `responsiveScale` clamps to 1.15.
describe('FIELD_MESSAGE_RAIL_STYLE', () => {
  it('minHeight is bound to Size.fieldMessageTrack, never to a literal', () => {
    expect(FIELD_MESSAGE_RAIL_STYLE.minHeight).toBe(Size.fieldMessageTrack);
  });

  it('never sets height — the rail is a floor, not a ceiling', () => {
    // Pinning a height reintroduces clipping at accessibility font sizes.
    expect('height' in FIELD_MESSAGE_RAIL_STYLE).toBe(false);
  });

  it('is never smaller than one --text-sm line at base font scale', () => {
    expect(FIELD_MESSAGE_RAIL_STYLE.minHeight).toBeGreaterThanOrEqual(20);
  });
});

describe('chunkTypeOptions', () => {
  it('chunks the five type options into rows of three, last row padded with null', () => {
    const rows = chunkTypeOptions(TYPE_OPTIONS, 3);
    expect(rows).toEqual([
      [TYPE_OPTIONS[0], TYPE_OPTIONS[1], TYPE_OPTIONS[2]],
      [TYPE_OPTIONS[3], TYPE_OPTIONS[4], null],
    ]);
  });

  it('every row has the same length', () => {
    const rows = chunkTypeOptions(TYPE_OPTIONS, 3);
    for (const row of rows) expect(row).toHaveLength(3);
  });

  it('pads a full final row, not just the 5-into-3 remainder the grid ships', () => {
    expect(chunkTypeOptions(TYPE_OPTIONS.slice(0, 4), 3)).toEqual([
      [TYPE_OPTIONS[0], TYPE_OPTIONS[1], TYPE_OPTIONS[2]],
      [TYPE_OPTIONS[3], null, null],
    ]);
    expect(chunkTypeOptions(TYPE_OPTIONS.slice(0, 3), 3)).toEqual([
      [TYPE_OPTIONS[0], TYPE_OPTIONS[1], TYPE_OPTIONS[2]],
    ]);
  });
});

describe('resolveBalanceField', () => {
  it('Credit Card gets the "amount owed" relabel', () => {
    expect(resolveBalanceField(AccountType.CreditCard)).toEqual({
      label: Strings.accountOwedLabel,
      helper: Strings.accountOwedHelper,
    });
  });

  it.each(Object.values(AccountType).filter((t) => t !== AccountType.CreditCard))(
    '%s gets the plain opening-balance label',
    (type) => {
      expect(resolveBalanceField(type)).toEqual({
        label: Strings.accountBalanceLabel,
        helper: Strings.accountBalanceHelper,
      });
    },
  );
});

describe('geometry relationships', () => {
  it('a currency segment stays tappable at the compact width', () => {
    expect(CURRENCY_SEGMENT_WIDTH).toBeGreaterThanOrEqual(TouchSize.min);
    expect(CURRENCY_CELL_WIDTH).toBeGreaterThan(2 * CURRENCY_SEGMENT_WIDTH);
  });

  it('ACCOUNT_TYPE_TILE_HEIGHT never breaches the touch-target floor', () => {
    expect(ACCOUNT_TYPE_TILE_HEIGHT).toBeGreaterThanOrEqual(TouchSize.min);
  });

  it('CREDIT_SLOT_MIN_HEIGHT is taller than a single field row', () => {
    expect(CREDIT_SLOT_MIN_HEIGHT).toBeGreaterThan(Size.fieldHeight);
  });
});
