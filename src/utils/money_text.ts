/**
 * Whether `text` is something the user can be part-way through typing into a
 * money field: digits, at most one decimal point, nothing else.
 *
 * It gates characters and never truncates a value — no 2dp cap, no
 * leading-zero insertion, no `.` normalisation, no comma stripping. `'0.005'`
 * has to reach the row validator and produce a legible floor message rather
 * than being silently rounded into `'0.00'`, and `'1,500'` has to be refused
 * outright rather than quietly parsed as 1500.
 */
export function isTypeableMoneyText(text: string): boolean {
  return /^\d*\.?\d*$/.test(text);
}
