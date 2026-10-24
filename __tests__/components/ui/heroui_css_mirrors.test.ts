import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { CHIP_MD_PADDING_BLOCK } from '@/components/ui/chip.geometry';
import { INPUT_PADDING_INLINE } from '@/components/ui/input.geometry';
import { TABS_LIST_PADDING, TABS_TRIGGER_PADDING_BLOCK } from '@/components/ui/tabs.geometry';
import { Radius } from '@/constants/theme';
import { CURRENCY_TABS_LIST_CHROME } from '@/modules/accounts/components/account_form/account_form.geometry';

// One rem in px, the unit Tailwind declares `--spacing` in.
const REM_PX = 16;

const HEROUI_STYLES_ROOT = ['heroui-native', 'src', 'styles'] as const;
const HEROUI_STYLES = [...HEROUI_STYLES_ROOT, 'components'] as const;

function vendorCss(...segments: readonly string[]): string {
  return readFileSync(resolve(process.cwd(), 'node_modules', ...segments), 'utf8');
}

function capture(pattern: RegExp, text: string, what: string): string {
  const found = pattern.exec(text)?.[1];
  if (found === undefined) throw new Error(`not in the vendor CSS: ${what}`);
  return found.trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The value `property` takes in the rule whose whole selector is `selector`. */
function declaration(css: string, selector: string, property: string): string {
  const rule = capture(
    new RegExp(`^${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`, 'm'),
    css,
    selector,
  );
  return capture(
    new RegExp(`(?:^|[;\\s])${escapeRegExp(property)}\\s*:\\s*([^;]+);`),
    rule,
    `${selector} { ${property} }`,
  );
}

function spacingPx(): number {
  const rem = capture(
    /--spacing:\s*(\d*\.?\d+)rem;/,
    vendorCss('tailwindcss', 'theme.css'),
    '--spacing',
  );
  return REM_PX * Number(rem);
}

/** HeroUI's `--radius` in px, at one rem of `REM_PX`. */
function baseRadiusPx(): number {
  const rem = capture(
    /(?:^|[\s;{])--radius:\s*(\d*\.?\d+)rem;/m,
    vendorCss(...HEROUI_STYLES_ROOT, 'variables.css'),
    '--radius',
  );
  return REM_PX * Number(rem);
}

/** `--radius-<step>` in px, read as `calc(var(--radius) * N)` from HeroUI's theme. */
function radiusStepPx(step: string): number {
  const factor = capture(
    new RegExp(
      `(?:^|[\\s;{])--radius-${escapeRegExp(step)}:\\s*calc\\(var\\(--radius\\)\\s*\\*\\s*(\\d*\\.?\\d+)\\);`,
      'm',
    ),
    vendorCss(...HEROUI_STYLES_ROOT, 'theme.css'),
    `--radius-${step}`,
  );
  return baseRadiusPx() * Number(factor);
}

/** A CSS length in px: `Npx`, `calc(var(--spacing) * N)` at Tailwind's `--spacing`, or HeroUI's `var(--radius-<step>)`. */
function toPx(value: string): number {
  const px = /^(\d*\.?\d+)px$/.exec(value)?.[1];
  if (px !== undefined) return Number(px);
  const steps = /^calc\(var\(--spacing\)\s*\*\s*(\d*\.?\d+)\)$/.exec(value)?.[1];
  if (steps !== undefined) return spacingPx() * Number(steps);
  const radius = /^var\(--radius-([\w-]+)\)$/.exec(value)?.[1];
  if (radius !== undefined) return radiusStepPx(radius);
  throw new Error(`not a px, --spacing or --radius length: ${value}`);
}

function px(
  file: 'button.css' | 'chip.css' | 'input.css' | 'tabs.css',
  selector: string,
  property: string,
): number {
  return toPx(declaration(vendorCss(...HEROUI_STYLES, file), selector, property));
}

describe('HeroUI CSS mirrors: each unscaled constant equals the vendor declaration it copies, and each override names the property the vendor declares', () => {
  it("MA-162: CHIP_MD_PADDING_BLOCK is .chip__root--size-md's padding-block", () => {
    expect(CHIP_MD_PADDING_BLOCK).toBe(px('chip.css', '.chip__root--size-md', 'padding-block'));
  });

  it("MA-248: Radius.heroButton is .button__root--size-sm's and .button__root--size-md's border-radius", () => {
    expect(Radius.heroButton).toBe(px('button.css', '.button__root--size-sm', 'border-radius'));
    expect(Radius.heroButton).toBe(px('button.css', '.button__root--size-md', 'border-radius'));
  });

  it("MA-248: Radius.heroButtonLg is .button__root--size-lg's border-radius", () => {
    expect(Radius.heroButtonLg).toBe(px('button.css', '.button__root--size-lg', 'border-radius'));
  });

  it("MA-179: INPUT_PADDING_INLINE is .input__input's padding-inline", () => {
    expect(INPUT_PADDING_INLINE).toBe(px('input.css', '.input__input', 'padding-inline'));
  });

  it("MA-162: TABS_TRIGGER_PADDING_BLOCK is .tabs__trigger's padding-block", () => {
    expect(TABS_TRIGGER_PADDING_BLOCK).toBe(px('tabs.css', '.tabs__trigger', 'padding-block'));
  });

  it("MA-162: TABS_LIST_PADDING is .tabs__list--variant-primary's padding", () => {
    expect(TABS_LIST_PADDING).toBe(px('tabs.css', '.tabs__list--variant-primary', 'padding'));
  });

  // `SegmentedTabs` zeroes `paddingLeft` and `paddingRight` on a scrollable row, the two keys this property compiles to.
  it("MA-165: the primary scroll content's side inset is still declared as padding-inline", () => {
    expect(() =>
      px('tabs.css', '.tabs__scroll-view-content-container--variant-primary', 'padding-inline'),
    ).not.toThrow();
  });

  it("MA-162: CURRENCY_TABS_LIST_CHROME is .tabs__list's gap plus twice the list padding", () => {
    expect(CURRENCY_TABS_LIST_CHROME).toBe(
      px('tabs.css', '.tabs__list', 'gap') +
        2 * px('tabs.css', '.tabs__list--variant-primary', 'padding'),
    );
  });

  // `.tabs__list` holds no `padding` and `.tabs__trigger` only the two longhands, so a loose match would return a value here.
  it('MA-162: a declaration the CSS does not hold throws, so its case fails', () => {
    expect(() => px('tabs.css', '.tabs__list', 'padding')).toThrow(Error);
    expect(() => px('tabs.css', '.tabs__trigger', 'padding')).toThrow(Error);
    expect(() => px('tabs.css', '.tabs__missing', 'padding')).toThrow(Error);
  });
});
