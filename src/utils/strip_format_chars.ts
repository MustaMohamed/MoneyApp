// Unicode category Cf: direction marks, zero-width characters, joiners, the soft hyphen.
export function stripFormatChars(name: string): string {
  return name.replace(/\p{Cf}/gu, '');
}

export function isBlankName(name: string): boolean {
  return stripFormatChars(name).trim() === '';
}
