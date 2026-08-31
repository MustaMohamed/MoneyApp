/** Takes stored 'HH:MM:SS'; emits 'H:MM AM/PM' with no leading zero hour and seconds dropped. */
export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const hours24 = Number(hStr);
  const minutes = mStr.padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}
