import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('confirmation action consumers', () => {
  it('shows transaction delete failures in the pending confirmation sheet', () => {
    const screen = source('src/modules/transactions/screens/transactions/index.tsx');
    const sheet = source(
      'src/modules/transactions/screens/transactions/detail/components/delete_confirm_dialog.tsx',
    );

    expect(screen).toContain('error: deleteError');
    expect(screen).toContain('errorMessage={deleteError ? Strings.errDeleteFailed : undefined}');
    expect(sheet).toContain('errorMessage?: string');
    expect(sheet).toContain('errorMessage={errorMessage}');
  });

  it('shows commitment deactivate and skip failures in their pending sheets', () => {
    const screen = source('src/modules/commitments/screens/commitments/index.tsx');
    const deleteSheet = source(
      'src/modules/commitments/screens/commitments/components/commitment_delete_confirm_sheet.tsx',
    );
    const skipSheet = source(
      'src/modules/commitments/screens/commitments/detail/components/skip_confirm_sheet.tsx',
    );

    expect(screen).toContain('error: deleteError');
    expect(screen).toContain('error: skipError');
    expect(screen).toContain('Strings.commitmentsDeactivateError');
    expect(screen).toContain('Strings.commitmentsSkipError');
    expect(deleteSheet).toContain('errorMessage={errorMessage}');
    expect(skipSheet).toContain('errorMessage={errorMessage}');
  });
});
