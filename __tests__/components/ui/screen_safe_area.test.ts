import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Screen safe-area layout', () => {
  it('applies requested safe-area insets during the initial JS style pass', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/ui/screen.tsx'), 'utf8');

    expect(source).toContain('useSafeAreaInsets');
    expect(source).toContain("paddingTop: hasEdge(edges, 'top') ? insets.top : 0");
    expect(source).toContain("paddingBottom: hasEdge(edges, 'bottom') ? insets.bottom : 0");
    expect(source).not.toContain('SafeAreaView');
  });
});
