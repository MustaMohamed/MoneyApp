import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('spending plan presentation styling', () => {
  it('uses HeroUI and Uniwind classes instead of feature-level StyleSheets', () => {
    expect(
      existsSync(
        resolve(
          process.cwd(),
          'src/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.styles.ts',
        ),
      ),
    ).toBe(false);
  });
});
