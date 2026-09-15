import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Source text, the `confirm_action_consumers.test.ts` shape: a prop reaching a button has no
// return value to bind to, and both files feed every confirm surface in the app.
function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const SURFACES = [
  { name: 'dialog', path: 'src/components/ui/confirm_dialog.tsx' },
  { name: 'sheet', path: 'src/components/ui/confirm_sheet.tsx' },
];

// The opening tag ends at its own first `>`, an arrow's excepted; past it the slice reads later source.
function openingTag(afterMarker: string): string {
  for (let i = 0; i < afterMarker.length; i += 1) {
    if (afterMarker[i] === '>' && afterMarker[i - 1] !== '=') return afterMarker.slice(0, i + 1);
  }
  throw new Error(`unterminated <Button tag: ${afterMarker.slice(0, 80)}`);
}

describe('both confirm surfaces render the flat button shape', () => {
  it.each(SURFACES)('$name renders exactly two buttons, both flat', ({ path }) => {
    const buttons = source(path).split('<Button').slice(1);

    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      const tag = openingTag(button).trimEnd();
      // Children would put `flat` out of the tag's reach, so the gate fails here rather than passing blind.
      expect(tag).toMatch(/\/>$/);
      expect(tag).toMatch(/(^|\s)flat(\s|$)/);
    }
  });
});

describe('the dialog carries a failure line', () => {
  const dialog = source('src/components/ui/confirm_dialog.tsx');

  it('declares the prop', () => {
    expect(dialog).toContain('errorMessage?: string');
  });

  it('renders it above the button row', () => {
    expect(dialog.indexOf('{errorMessage}')).toBeGreaterThan(-1);
    expect(dialog.indexOf('{errorMessage}')).toBeLessThan(dialog.indexOf('<Button'));
  });
});
