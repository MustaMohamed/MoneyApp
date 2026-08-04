import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { FontFamily } from '@/constants/theme';

/**
 * Guards the chain that audit H15 broke silently: a `font-*` class only paints
 * if a matching `--font-*` token exists **in `@theme inline`**, and that token
 * only paints if the face it names was actually loaded. Every link is invisible
 * at runtime — a missing token drops the declaration and the text renders in the
 * system font with CI fully green. These assertions are the only automated check
 * on that path.
 *
 * The `@theme inline` distinction is load-bearing, not pedantry. Tokens declared
 * outside that block (HeroUI's four weights live in `@layer theme`) resolve for
 * `var()` but generate no utility, so treating them as backing for a class name
 * would wave through exactly the silent failure this file exists to catch.
 */

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const globalCss = source('global.css');
const layout = source('src/app/_layout.tsx');

const TOKEN = /--font-([a-z0-9-]+):\s*([A-Za-z0-9_]+);/g;

/** The `@theme inline { ... }` body — the only tokens Tailwind turns into utilities. */
function themeBlock(): string {
  // Anchored at line start: the phrase also appears in prose above, and matching
  // that would slice in the very tokens some of these assertions exclude.
  const atRule = /^@theme inline\s*\{/m.exec(globalCss);
  if (!atRule) throw new Error('no @theme inline block in global.css');
  return globalCss.slice(atRule.index);
}

function tokensIn(css: string): Map<string, string> {
  return new Map([...css.matchAll(TOKEN)].map(([, name, face]) => [name, face]));
}

/** Every `.ts`/`.tsx` under src/, walked without shelling out. */
function sourceFiles(dir = 'src'): string[] {
  return readdirSync(resolve(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function fontClassesUsedInSource(): Set<string> {
  const used = new Set<string>();
  for (const file of sourceFiles()) {
    for (const [cls] of source(file).matchAll(/\bfont-[a-zA-Z0-9-]+/g)) used.add(cls);
  }
  return used;
}

describe('typography tokens', () => {
  it('every font-* class used in src is backed by a utility-generating token', () => {
    const declared = tokensIn(themeBlock());
    const unresolved = [...fontClassesUsedInSource()].filter(
      (cls) => !declared.has(cls.replace(/^font-/, '')),
    );

    expect(unresolved).toEqual([]);
  });

  it('no bare Tailwind weight class survives — React Native cannot apply one', () => {
    // `font-semibold` sets font-weight, which Android will not use to pick among
    // separately-registered custom faces. Weight has to be part of the family.
    const bareWeights = [...fontClassesUsedInSource()].filter((cls) =>
      /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(cls),
    );

    expect(bareWeights).toEqual([]);
  });

  it('every --font-* token names a face loaded in _layout.tsx', () => {
    const unloaded = [...tokensIn(globalCss)].filter(([, face]) => !layout.includes(face));

    expect(unloaded).toEqual([]);
  });

  it('FontFamily mirrors the loaded faces, so module-level and class styling agree', () => {
    // constants/theme.ts is the escape hatch for style-prop callers. If it drifts
    // from the tokens, the same element renders differently depending on which
    // route the caller took.
    const tokenFaces = new Set(tokensIn(globalCss).values());

    expect(new Set(Object.values(FontFamily))).toEqual(tokenFaces);
  });

  it('defines the four weight tokens HeroUI Native resolves type through', () => {
    // heroui-native >=1.0.7 does `font-family: var(--font-<weight>)` internally.
    // Missing tokens mean every HeroUI primitive renders unweighted.
    const declared = tokensIn(globalCss);

    for (const weight of ['normal', 'medium', 'semibold', 'bold']) {
      expect(declared.get(weight)).toMatch(/^(Inter|Sora)_\d{3}[A-Za-z]+$/);
    }
  });

  it('keeps HeroUI weight tokens out of the Tailwind theme block', () => {
    // In `@theme inline` they would become *family* utilities, and Tailwind
    // resolves `font-<x>` as a family before a weight — silently re-pointing
    // every bare weight class in the app. They must stay plain properties.
    const declared = tokensIn(themeBlock());

    for (const weight of ['normal', 'medium', 'semibold', 'bold']) {
      expect(declared.has(weight)).toBe(false);
    }
  });
});
