/**
 * Fix D — lg snap-point bump: 85% → 92%
 *
 * Rationale: sheets sit inside <Screen> which already loses ~80px to safe
 * area + Stack header. At 85% the visible sheet height was cramped on
 * devices with tall status bars. 92% gives noticeably more room without
 * going full-screen (which would feel like a modal, not a sheet).
 * sm stays at 50% — no change.
 */

import * as fs from 'fs';
import * as path from 'path';

const SHEET_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../../components/ui/sheet.tsx'),
  'utf8',
);

describe('Sheet SNAP_POINTS — lg bump to 92% (Fix D)', () => {
  it('lg snap point is 92%', () => {
    expect(SHEET_SOURCE).toContain("lg: ['92%']");
  });

  it('lg snap point is NOT 85% (old value removed)', () => {
    expect(SHEET_SOURCE).not.toContain("lg: ['85%']");
  });

  it('sm snap point remains 50% (unchanged)', () => {
    expect(SHEET_SOURCE).toContain("sm: ['50%']");
  });
});
