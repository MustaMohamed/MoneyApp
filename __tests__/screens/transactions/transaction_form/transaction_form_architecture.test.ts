import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SOURCE_ROOT = resolve(process.cwd(), 'src');
const VERSIONED_FORM_ROOT = resolve(
  process.cwd(),
  'src/modules/transactions/screens/transactions/transaction_form_v2',
);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('transaction form architecture', () => {
  it('uses one canonical transaction form module without versioned surfaces', () => {
    expect(existsSync(VERSIONED_FORM_ROOT)).toBe(false);

    for (const path of sourceFiles(SOURCE_ROOT)) {
      const source = readFileSync(path, 'utf8');
      expect(source).not.toContain('transaction_form_v2');
      expect(source).not.toContain('TransactionFormV2');
    }
  });
});
