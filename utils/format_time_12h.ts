/**
 * Convert a SQLite-stored 'HH:MM:SS' (24-hour) time string to 12-hour 'H:MM AM/PM'.
 *
 * Hours: 1–12 with no leading zero. Minutes: zero-padded.
 * Seconds are dropped.
 */
export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const hours24 = Number(hStr);
  const minutes = mStr.padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}
