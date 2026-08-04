import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards the chain that audit H15 broke silently: a `font-*` class only paints
 * if a matching `--font-*` token exists, and that token only paints if the face
 * it names was actually loaded. Every link is invisible at runtime — a missing
 * token drops the declaration and the text renders in the system font with CI
 * fully green. These assertions are the only automated check on that path.
 */

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const globalCss = source('global.css');
const layout = source('src/app/_layout.tsx');

/** `font-<name>` classes appearing anywhere in a string literal under src/. */
function fontClassesUsedInSource(): Set<string> {
  const files = execSync("grep -rl 'font-' src/ --include='*.tsx' --include='*.ts'", {
    encoding: 'utf8',
  })
    .trim()
    .split('\n');

  const used = new Set<string>();
  for (const file of files) {
    for (const [cls] of source(file).matchAll(/\bfont-[a-zA-Z0-9-]+/g)) used.add(cls);
  }
  return used;
}

/** `--font-<name>: <Face>;` declarations, wherever they sit in global.css. */
function declaredFontTokens(): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of globalCss.matchAll(/--font-([a-z0-9-]+):\s*([A-Za-z0-9_]+);/g)) {
    tokens.set(name, value);
  }
  return tokens;
}

describe('typography tokens', () => {
  it('every font-* class used in src resolves to a --font-* token', () => {
    const declared = declaredFontTokens();
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
    const unloaded = [...declaredFontTokens()].filter(([, face]) => !layout.includes(face));

    expect(unloaded).toEqual([]);
  });

  it('defines the four weight tokens HeroUI Native resolves type through', () => {
    // heroui-native >=1.0.7 does `font-family: var(--font-<weight>)` internally.
    // Missing tokens mean every HeroUI primitive renders unweighted.
    const declared = declaredFontTokens();

    for (const weight of ['normal', 'medium', 'semibold', 'bold']) {
      expect(declared.get(weight)).toMatch(/^(Inter|Sora)_\d{3}[A-Za-z]+$/);
    }
  });

  it('keeps HeroUI weight tokens out of the Tailwind theme block', () => {
    // In `@theme inline` they would become *family* utilities, and Tailwind
    // resolves `font-<x>` as a family before a weight — silently re-pointing
    // every bare weight class in the app. They must stay plain properties.
    // Anchored at line start — the phrase also appears in prose above, and
    // matching that would slice in the very tokens this asserts are excluded.
    const atRule = /^@theme inline\s*\{/m.exec(globalCss);
    expect(atRule).not.toBeNull();
    const themeBlock = globalCss.slice(atRule?.index ?? 0);

    for (const weight of ['normal', 'medium', 'semibold', 'bold']) {
      expect(themeBlock).not.toContain(`--font-${weight}:`);
    }
  });
});
