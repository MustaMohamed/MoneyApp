import Database from 'better-sqlite3';

import { AccountColors, Colors } from '@/constants/theme';
import { MIGRATIONS } from '@/database/migrations';
import { contrastRatio } from '@/modules/accounts/constants/account_palette';
import { registerOpenDbsDrain } from '@/test_helpers/sqlite_drain';

const openDbs = registerOpenDbsDrain();

// WCAG 2.2 non-text contrast, measured on the untinted fill beneath the glyph.
const MIN_GLYPH_RATIO = 3;
const LUMINANCE_BAND = { min: 0.187, max: 0.245 } as const;

const BACKDROPS: Record<string, string> = {
  darkScreen: Colors.dark.bg,
  darkChip: Colors.dark.surfaceEl,
  heroGradientMiddle: Colors.shared.heroGrad2,
  lightSurface: Colors.light.surface,
  lightChip: Colors.light.surfaceEl,
};

// The category form's swatches before MA-103, in form order.
const RETIRED_SWATCHES = [
  '#1B2B4B',
  '#C9973A',
  '#3D7A5F',
  '#C0442A',
  '#4A2545',
  '#185FA5',
  '#D4830A',
  '#2D7D6E',
  '#7B3F8C',
  '#C45C2A',
  '#4A6FA5',
  '#7A8B3C',
];
const RETIRED_TONES = new Set([...RETIRED_SWATCHES, '#4CAF82']);

interface Labelled {
  label: string;
  colour: string;
}

interface CategoryColour {
  id: string;
  color: string;
}

const swatches: Labelled[] = AccountColors.map((colour, i) => ({
  label: `swatch ${i + 1}`,
  colour,
}));

function relativeLuminance(hex: string): number {
  return contrastRatio(hex, '#000000') * 0.05 - 0.05;
}

function belowFloor(
  entries: readonly Labelled[],
): { label: string; backdrop: string; ratio: number }[] {
  return entries.flatMap(({ label, colour }) =>
    Object.entries(BACKDROPS).flatMap(([backdrop, fill]) => {
      const ratio = contrastRatio(colour, fill);
      return ratio < MIN_GLYPH_RATIO
        ? [{ label: `${label} ${colour}`, backdrop, ratio: Number(ratio.toFixed(2)) }]
        : [];
    }),
  );
}

function openDatabase(maxVersion: number): Database.Database {
  const db = new Database(':memory:');
  openDbs.push(db);
  db.pragma('foreign_keys = ON');
  db.exec(
    MIGRATIONS.filter(({ version }) => version <= maxVersion)
      .map(({ up }) => up)
      .join('\n'),
  );
  return db;
}

function freshInstallColours(): CategoryColour[] {
  const db = openDatabase(Number.POSITIVE_INFINITY);
  return db.prepare('SELECT id, color FROM categories ORDER BY id').all() as CategoryColour[];
}

describe('category colours clear the 3:1 glyph floor on both themes', () => {
  it('every swatch in the category form clears 3:1 on all five backdrops', () => {
    expect(swatches).toHaveLength(12);
    expect(belowFloor(swatches)).toEqual([]);
  });

  it('every fresh-install category colour clears 3:1 on all five backdrops', () => {
    const rows = freshInstallColours();

    expect(rows).toHaveLength(29);
    expect(belowFloor(rows.map(({ id, color }) => ({ label: id, colour: color })))).toEqual([]);
  });

  it('every swatch and every fresh-install colour sits in the 0.187 to 0.245 luminance band', () => {
    const entries = [
      ...swatches,
      ...freshInstallColours().map(({ id, color }) => ({ label: id, colour: color })),
    ];

    const outside = entries
      .map(({ label, colour }) => ({
        label: `${label} ${colour}`,
        luminance: Number(relativeLuminance(colour).toFixed(3)),
      }))
      .filter(({ luminance }) => luminance < LUMINANCE_BAND.min || luminance > LUMINANCE_BAND.max);
    expect(outside).toEqual([]);
  });

  it('a fresh install holds every swatch and none of the retired tones', () => {
    const rows = freshInstallColours();
    const held = new Set(rows.map(({ color }) => color));

    expect(AccountColors.filter((colour) => !held.has(colour))).toEqual([]);
    expect(rows.filter(({ color }) => RETIRED_TONES.has(color))).toEqual([]);
  });

  it('only the four seed-only categories hold a tone no swatch offers', () => {
    const offered = new Set<string>(AccountColors);

    expect(freshInstallColours().filter(({ color }) => !offered.has(color))).toEqual([
      { id: 'cat_other_expense', color: '#6B7F99' },
      { id: 'cat_other_income', color: '#6B7F99' },
      { id: 'cat_salary', color: '#3E8F6A' },
      { id: 'cat_savings', color: '#3E8F6A' },
    ]);
  });

  it('an upgraded category on a retired swatch reads the new swatch at the same position', () => {
    const db = openDatabase(20);
    const insert = db.prepare(
      `INSERT INTO categories
         (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES (?, ?, 'expense', 'star', ?, 0, 40, '2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z')`,
    );
    RETIRED_SWATCHES.forEach((colour, i) => insert.run(`user_${i}`, `User ${i}`, colour));
    db.exec(
      MIGRATIONS.filter(({ version }) => version > 20)
        .map(({ up }) => up)
        .join('\n'),
    );

    const positions = RETIRED_SWATCHES.map((retired, i) => ({
      position: i + 1,
      retired,
      upgraded: (
        db.prepare('SELECT color FROM categories WHERE id = ?').get(`user_${i}`) as {
          color: string;
        }
      ).color,
      swatch: AccountColors[i],
    }));
    expect(positions.filter(({ upgraded, retired }) => upgraded === retired)).toEqual([]);
    expect(positions.filter(({ upgraded, swatch }) => upgraded !== swatch)).toEqual([]);
  });
});
