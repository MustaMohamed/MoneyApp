// Callers: the overlay press and the HeroUI Dialog primitive's hardware-back listener, both via `onOpenChange(false)`.
export function shouldDismissOnOpenChange(open: boolean, busy: boolean): boolean {
  return !open && !busy;
}
