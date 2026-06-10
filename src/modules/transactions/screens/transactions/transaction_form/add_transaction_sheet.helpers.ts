export function shouldRenderAddTransactionSheetBody(
  visible: boolean,
  shouldRenderBody: boolean,
): boolean {
  return visible || shouldRenderBody;
}
