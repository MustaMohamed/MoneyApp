import { FadeInDown, FadeOutUp } from 'react-native-reanimated';

/** account_form.tsx's credit-card block transition. */
export function useAccountFormAnim() {
  return {
    ccEntering: FadeInDown.duration(250),
    ccExiting: FadeOutUp.duration(200),
  };
}

/** credit_card_fields.tsx's APR block transition. */
export function useCreditCardFieldsAnim() {
  return {
    aprEntering: FadeInDown.duration(200),
    aprExiting: FadeOutUp.duration(150),
  };
}
