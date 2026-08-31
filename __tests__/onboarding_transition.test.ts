import { OnboardingStep } from '@/constants/enums';
import { ONBOARDING_STEP_HREF } from '@/modules/onboarding/domain/onboarding_route';
import { runOnboardingTransition } from '@/modules/onboarding/domain/onboarding_transition';
import { createOnboardingTransitionState } from '@/modules/onboarding/screens/onboarding/onboarding_transition.state';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('runOnboardingTransition', () => {
  it('calls persist before navigate, in that order', async () => {
    const state = createOnboardingTransitionState();
    const calls: string[] = [];
    const navigate = jest.fn((..._args: unknown[]) => {
      calls.push('navigate');
    });
    const session = state.getState().begin();
    if (session === null) throw new Error('expected a session');

    await runOnboardingTransition({
      session,
      api: state.getState(),
      navigate,
      desiredStep: OnboardingStep.N1,
      readAccountCount: () => 0,
      persist: async (resolve) => {
        calls.push('persist');
        return resolve();
      },
      errorMessage: 'error',
    });

    expect(calls).toEqual(['persist', 'navigate']);
  });

  it('navigates to the resolved href, not the desired one', async () => {
    const state = createOnboardingTransitionState();
    const navigate = jest.fn();
    const session = state.getState().begin();
    if (session === null) throw new Error('expected a session');

    await runOnboardingTransition({
      session,
      api: state.getState(),
      navigate,
      desiredStep: OnboardingStep.N2,
      readAccountCount: () => 1,
      persist: async (resolve) => resolve(),
      errorMessage: 'error',
    });

    expect(navigate).toHaveBeenCalledWith(ONBOARDING_STEP_HREF[OnboardingStep.N3]);
  });

  it('a rejecting persist does not navigate, sets statusMessage, and clears busy', async () => {
    const state = createOnboardingTransitionState();
    const navigate = jest.fn();
    const session = state.getState().begin();
    if (session === null) throw new Error('expected a session');

    await runOnboardingTransition({
      session,
      api: state.getState(),
      navigate,
      desiredStep: OnboardingStep.N1,
      readAccountCount: () => 0,
      persist: async () => {
        throw new Error('boom');
      },
      errorMessage: 'Could not save',
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(state.getState().statusMessage).toBe('Could not save');
    expect(state.getState().busy).toBe(false);
  });

  it('begin() returns null while busy — a concurrent call performs no persist and no navigate', async () => {
    const state = createOnboardingTransitionState();
    const navigate = jest.fn();
    const persist = jest.fn(() => pending.promise);
    const pending = deferred<OnboardingStep>();

    // Mirrors the real caller: begin() first, run the runner only if it returned a session.
    const attempt = () => {
      const session = state.getState().begin();
      if (session === null) return Promise.resolve();
      return runOnboardingTransition({
        session,
        api: state.getState(),
        navigate,
        desiredStep: OnboardingStep.N1,
        readAccountCount: () => 0,
        persist,
        errorMessage: 'error',
      });
    };

    const firstRun = attempt();
    const secondRun = attempt();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();

    pending.resolve(OnboardingStep.N1);
    await Promise.all([firstRun, secondRun]);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('invalidate() between the persist resolving and the runner continuing suppresses navigate and clears status', async () => {
    const state = createOnboardingTransitionState();
    const navigate = jest.fn();
    const session = state.getState().begin();
    if (session === null) throw new Error('expected a session');

    await runOnboardingTransition({
      session,
      api: state.getState(),
      navigate,
      desiredStep: OnboardingStep.N1,
      readAccountCount: () => 0,
      persist: async (resolve) => {
        const resolved = resolve();
        state.getState().invalidate();
        return resolved;
      },
      errorMessage: 'error',
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(state.getState().statusMessage).toBe('');
    expect(state.getState().busy).toBe(false);
  });

  it('a two-await persist whose session is invalidated between the awaits never performs the second write', async () => {
    const state = createOnboardingTransitionState();
    const navigate = jest.fn();
    const secondWrite = jest.fn();
    const session = state.getState().begin();
    if (session === null) throw new Error('expected a session');

    await runOnboardingTransition({
      session,
      api: state.getState(),
      navigate,
      desiredStep: OnboardingStep.N3,
      readAccountCount: () => 1,
      persist: async (resolve, isCurrent) => {
        await Promise.resolve();
        state.getState().invalidate();
        if (!isCurrent()) return undefined;
        secondWrite();
        return resolve();
      },
      errorMessage: 'error',
    });

    expect(secondWrite).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('readAccountCount is read live, after persist’s own await — regression test for the pre-insert-count loop', async () => {
    const state = createOnboardingTransitionState();
    const navigate = jest.fn();
    const session = state.getState().begin();
    if (session === null) throw new Error('expected a session');

    // Models the real account store: 0 until the insert's await settles, 1 after.
    let insertSettled = false;
    const readAccountCount = () => (insertSettled ? 1 : 0);

    await runOnboardingTransition({
      session,
      api: state.getState(),
      navigate,
      desiredStep: OnboardingStep.N3,
      readAccountCount,
      persist: async (resolve) => {
        await Promise.resolve();
        insertSettled = true;
        return resolve();
      },
      errorMessage: 'error',
    });

    expect(navigate).toHaveBeenCalledWith(ONBOARDING_STEP_HREF[OnboardingStep.N3]);
  });
});
