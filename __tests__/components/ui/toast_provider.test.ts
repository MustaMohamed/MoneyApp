import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { TOAST_PROVIDER_PROPS, useToast } from '@/components/ui/toast';

const layout = readFileSync(resolve(process.cwd(), 'src/app/_layout.tsx'), 'utf8');

describe('the app toast configuration', () => {
  it('places toasts at the bottom', () => {
    expect(TOAST_PROVIDER_PROPS.defaultProps.placement).toBe('bottom');
  });

  it('shows one at a time', () => {
    expect(TOAST_PROVIDER_PROPS.maxVisibleToasts).toBe(1);
  });

  it('re-exports a callable hook, under the jest mock a consumer suite runs against', () => {
    expect(typeof useToast).toBe('function');
  });
});

// Source text: a provider reaching the root has no return value to bind an assertion to.
describe('the toast is mounted once, at the root', () => {
  it('mounts exactly one provider', () => {
    expect(layout.split('<AppToastProvider')).toHaveLength(2);
  });

  it('keeps the raw HeroUI provider, whose own ToastProvider and PortalHost would double these', () => {
    expect(layout).toContain("from 'heroui-native/provider-raw'");
    expect(layout).not.toContain("from 'heroui-native/provider'");
  });

  it('wraps the portal host, so a dialog or sheet can call useToast', () => {
    expect(layout.split('<PortalHost />')).toHaveLength(2);
    expect(layout.indexOf('<PortalHost />')).toBeGreaterThan(layout.indexOf('<AppToastProvider'));
    expect(layout.indexOf('<PortalHost />')).toBeLessThan(layout.indexOf('</AppToastProvider>'));
  });
});
