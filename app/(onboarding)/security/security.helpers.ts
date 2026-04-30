import type { SecurityChoice } from '@/store/onboarding_store';

export function canProceed(selected: SecurityChoice | null): selected is SecurityChoice {
  return selected !== null;
}
