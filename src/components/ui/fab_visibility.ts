export function shouldHideGlobalFab(pathname: string, anySheetOpen: boolean): boolean {
  return (
    anySheetOpen ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/transactions/') ||
    pathname.startsWith('/commitments/') ||
    pathname.startsWith('/budget/')
  );
}
