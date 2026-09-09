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

describe('both confirm surfaces render the flat button shape', () => {
  it.each(SURFACES)('$name renders exactly two buttons, both flat', ({ path }) => {
    const buttons = source(path).split('<Button').slice(1);

    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      const props = button.slice(0, button.indexOf('/>'));
      expect(props).toMatch(/(^|\s)flat(\s|$)/);
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
