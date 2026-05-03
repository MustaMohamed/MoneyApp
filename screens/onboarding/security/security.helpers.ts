import type { SecurityChoice } from '@/constants/enums';

export function canProceed(selected: SecurityChoice | undefined): selected is SecurityChoice {
  return selected !== undefined;
}
