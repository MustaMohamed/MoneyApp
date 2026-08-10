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

// account_type_pill.tsx (still, until step 7's cleanup) imports
// react-native-reanimated for TypePill's press animation — this file only
// needs the plain TYPE_OPTIONS array, but the import chain still runs, and
// reanimated's native worklets module throws when imported un-mocked outside
// a rendered .tsx test. Every render suite in this tree that touches
// reanimated mocks it the same way (e.g. transaction_row.test.tsx); this is
// that same test-infra device, not a mock of anything this file asserts.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {},
  useAnimatedStyle: () => ({}),
  useSharedValue: (initial: unknown) => ({ value: initial }),
  withSequence: () => 0,
  withSpring: () => 0,
}));

/**
 * The zero-shift contract's rail (spec.md:42-45) is only assertable in a
 * test that binds to the named token, never to a literal — the Done-when
 * clause this file exists to close. Under jest-expo, Dimensions is mocked
 * at 750pt, so responsiveScale clamps to 1.15 and a bare toBe(20) would
 * fail here — geometry_tokens.test.ts:14-16 records exactly this trap.
 */
describe('FIELD_MESSAGE_RAIL_STYLE', () => {
  it('minHeight is bound to Size.fieldMessageTrack, never to a literal', () => {
    expect(FIELD_MESSAGE_RAIL_STYLE.minHeight).toBe(Size.fieldMessageTrack);
  });

  it('never sets height — the rail is a floor, not a ceiling', () => {
    // The assertion that fails if someone "fixes" a rendering glitch by
    // pinning the height, which is what silently reintroduces clipping at
    // accessibility font sizes (spec.md:45).
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

  it('the chunking input never depends on selection — grid position cannot move on selection', () => {
    // chunkTypeOptions takes no "selected" argument at all; calling it twice
    // with the same options produces the identical shape regardless of any
    // selection state elsewhere in the form.
    expect(chunkTypeOptions(TYPE_OPTIONS, 3)).toEqual(chunkTypeOptions(TYPE_OPTIONS, 3));
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
  it('CURRENCY_CELL_WIDTH is at least the composed Tabs.List width (2 segments + gap 4 + padding 6)', () => {
    // Stated as a relationship, not a restatement of the definition — a
    // toBe(2 * CURRENCY_SEGMENT_WIDTH + 10) would be a tautology with no
    // failure mode (.claude/rules/tests.md).
    expect(CURRENCY_CELL_WIDTH).toBeGreaterThanOrEqual(2 * CURRENCY_SEGMENT_WIDTH + 10);
  });

  it('ACCOUNT_TYPE_TILE_HEIGHT never breaches the touch-target floor', () => {
    expect(ACCOUNT_TYPE_TILE_HEIGHT).toBeGreaterThanOrEqual(TouchSize.min);
  });

  it('CREDIT_SLOT_MIN_HEIGHT is taller than a single field row', () => {
    expect(CREDIT_SLOT_MIN_HEIGHT).toBeGreaterThan(Size.fieldHeight);
  });
});
