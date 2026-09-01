import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { FontFamily } from '@/constants/theme';

// `scripts/lib/strip-comments.js` is a plain CommonJS node script; `strip-comments.d.ts` types it.
import { stripComments } from '../scripts/lib/strip-comments';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const globalCss = source('global.css');
const layout = source('src/app/_layout.tsx');

const TOKEN = /--font-([a-z0-9-]+):\s*([A-Za-z0-9_]+);/g;

/** The `@theme inline { ... }` body; the only tokens Tailwind turns into utilities. */
function themeBlock(): string {
  // Anchored at line start so the same phrase inside a comment does not match.
  const atRule = /^@theme inline\s*\{/m.exec(globalCss);
  if (!atRule) throw new Error('no @theme inline block in global.css');
  return globalCss.slice(atRule.index);
}

function tokensIn(css: string): Map<string, string> {
  return new Map([...css.matchAll(TOKEN)].map(([, name, face]) => [name, face]));
}

/** Faces registered with `useFonts({ ... })`; an imported but unregistered face never loads. */
function registeredFaces(): Set<string> {
  const call = layout.indexOf('useFonts({');
  if (call === -1) throw new Error('no `useFonts({ ... })` call in src/app/_layout.tsx');

  // Brace-matched because `[^}]*` stops at the first nested `}`.
  const open = layout.indexOf('{', call);
  let depth = 0;
  let close = -1;
  for (let i = open; i < layout.length; i++) {
    if (layout[i] === '{') depth++;
    else if (layout[i] === '}' && --depth === 0) {
      close = i;
      break;
    }
  }
  if (close === -1) throw new Error('could not parse the `useFonts` call — unbalanced braces');

  // Top-level entries only; keys of a nested object are not registered faces.
  const faces = new Set<string>();
  let nesting = 0;
  let entry = '';
  const take = (raw: string) => {
    const name = raw.split(':')[0]?.trim();
    // Skips spreads and computed keys; the set comparison below reports them.
    if (name && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) faces.add(name);
  };

  for (const char of layout.slice(open + 1, close)) {
    if ('{(['.includes(char)) nesting++;
    else if ('})]'.includes(char)) nesting--;

    if (char === ',' && nesting === 0) {
      take(entry);
      entry = '';
    } else entry += char;
  }
  take(entry);

  return faces;
}

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
    // Comments stripped first: an `oxlint-disable` citing `moneyapp/font-size-pairs-line-height`
    // otherwise reads as a `font-size-pairs-line-height` Tailwind class.
    const code = stripComments(source(file).split('\n')).join('\n');
    for (const [cls] of code.matchAll(/\bfont-[a-zA-Z0-9-]+/g)) used.add(cls);
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
    // Android will not use `font-weight` to pick among separately registered custom faces.
    const bareWeights = [...fontClassesUsedInSource()].filter((cls) =>
      /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(cls),
    );

    expect(bareWeights).toEqual([]);
  });

  it('the registered faces and the token faces are exactly the same set', () => {
    const registered = registeredFaces();
    const tokenFaces = new Set(tokensIn(globalCss).values());

    // A token naming an unregistered face renders as nothing.
    expect([...tokenFaces].filter((face) => !registered.has(face))).toEqual([]);
    // A registered face with no token is ~345KB of bundle bought for nothing.
    expect([...registered].filter((face) => !tokenFaces.has(face))).toEqual([]);
  });

  it('FontFamily mirrors the loaded faces, so module-level and class styling agree', () => {
    // `theme.ts` is the style-prop escape hatch; drift renders one element two ways.
    const tokenFaces = new Set(tokensIn(globalCss).values());

    expect(new Set(Object.values(FontFamily))).toEqual(tokenFaces);
  });

  it('defines the four weight tokens HeroUI Native resolves type through', () => {
    // HeroUI reads `var(--font-<weight>)`; missing tokens leave every primitive unweighted.
    const declared = tokensIn(globalCss);

    for (const weight of ['normal', 'medium', 'semibold', 'bold']) {
      expect(declared.get(weight)).toMatch(/^(Inter|Sora)_\d{3}[A-Za-z]+$/);
    }
  });

  it('keeps HeroUI weight tokens out of the Tailwind theme block', () => {
    // In `@theme inline` these become family utilities and re-point every bare weight class.
    const declared = tokensIn(themeBlock());

    for (const weight of ['normal', 'medium', 'semibold', 'bold']) {
      expect(declared.has(weight)).toBe(false);
    }
  });
});
