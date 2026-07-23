import fs from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Budget copy sheet architecture', () => {
  it('shares one named preview-row height between skeleton and loaded styles', () => {
    const theme = source('src/constants/theme.ts');
    const sheet = source('src/modules/budget/screens/budget/components/budget_copy_sheet.tsx');

    expect(theme).toContain('budgetCopyPreviewRowHeight: ms(54)');
    expect(sheet.match(/minHeight: Size\.budgetCopyPreviewRowHeight/g)).toHaveLength(2);
    expect(sheet).not.toContain('minHeight: ms(54)');
  });
});
