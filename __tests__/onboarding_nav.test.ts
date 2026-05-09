import { backOrReplace } from '@/utils/onboarding_nav';
import type { Href, Router } from 'expo-router';

function makeRouter(canGoBack: boolean): Router {
  return {
    canGoBack: jest.fn(() => canGoBack),
    back: jest.fn(),
    replace: jest.fn(),
  } as unknown as Router;
}

describe('backOrReplace', () => {
  const fallback = '/welcome' as Href;

  it('calls router.back() when canGoBack returns true', () => {
    const router = makeRouter(true);
    backOrReplace(router, fallback);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('calls router.replace(fallback) when canGoBack returns false', () => {
    const router = makeRouter(false);
    backOrReplace(router, fallback);
    expect(router.replace).toHaveBeenCalledWith(fallback);
    expect(router.back).not.toHaveBeenCalled();
  });
});
