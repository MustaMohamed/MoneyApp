import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('tab screen headers', () => {
  it('does not keep the unused custom TabHeader wrapper', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/ui/tab_header.tsx'))).toBe(false);
  });
});
