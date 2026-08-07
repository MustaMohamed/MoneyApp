import { createOnboardingTransitionState } from '@/modules/onboarding/screens/onboarding/onboarding_transition.state';

// Not named in the plan's Decision 3 file list, which enumerates only the
// three forward-transition screens — but the corrected Done-when puts a
// back chevron on N4 too, and Decision 4 requires all four back chevrons to
// share the same busy/message mechanism as the other three. A fourth,
// screen-owned instance is the only way to give N4's back that without
// reusing another screen's slot (audit L27, same reasoning as the other
// three `.state.ts` files here).
export const useReadyTransitionState = createOnboardingTransitionState();
