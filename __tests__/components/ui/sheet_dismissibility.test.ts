import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Sheet dismissibility wiring', () => {
  it('defaults to dismissible and forwards the setting to every native dismissal path', () => {
    const sheet = source('src/components/ui/sheet.tsx');

    expect(sheet).toContain('isDismissable?: boolean;');
    expect(sheet).toContain('isDismissable = true,');
    expect(sheet).toContain('<BottomSheet.Overlay isCloseOnPress={isDismissable} />');
    expect(sheet).toContain('enablePanDownToClose={isDismissable}');
    expect(sheet).toContain('isDisabled={!isDismissable}');
  });
});
