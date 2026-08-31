// Raw colour values only; prefer Tailwind theme slots in className. `Colors` is in `theme.ts`.

export const CoreTokens = {
  bg: '#0F1923',
  surface: '#1A2535',
  surfaceEl: '#243044',
  border: '#2A3A4F',
  text1: '#F0EBE3',
  text2: '#6B7F99',
  text3: '#4A5568',
  hint: '#4A5568', // Alias of `text3`, used for skippable copy
} as const;

export const GoldTokens = {
  400: '#E0B968',
  500: '#D4A44C',
  600: '#C9973A',
  700: '#A47C2C',
} as const;

export const SemanticTokens = {
  positive: '#4CAF82',
  negative: '#E05A42',
  warning: '#E8B130',
  // Must agree with `global.css` `--info` and `InfoTokens[500]`; a test pins all three.
  info: '#499EE0',
} as const;

// Transfer and CC payment accents; must mirror `global.css`.
export const InfoTokens = {
  500: '#499EE0',
} as const;

export const AccentCCTokens = {
  500: '#9B73D4',
} as const;

// `plum` and `rose` are not standalone accents; they exist only in `AcctTokens`.
export const AccentTokens = {
  nile: '#2D7D6E',
  spice: '#C45C2A',
  lapis: '#185FA5',
  sand: '#C9A876',
} as const;

// `rich` is a card or tile background; `soft` is a list-row dot or avatar chip.
export const AcctTokens = {
  midnight: { rich: '#1B2B4B', soft: '#3D4E73' },
  gold: { rich: '#C9973A', soft: '#E0B968' },
  nile: { rich: '#2D7D6E', soft: '#5BA597' },
  paprika: { rich: '#C45C2A', soft: '#E08456' },
  plum: { rich: '#5A2D55', soft: '#8B5685' },
  lapis: { rich: '#185FA5', soft: '#4A88C4' },
  rose: { rich: '#B8526D', soft: '#D88197' },
  sand: { rich: '#C9A876', soft: '#E0C99A' },
  amethyst: { rich: '#7B3F8C', soft: '#A87AB5' },
  emerald: { rich: '#4CAF82', soft: '#7AC9A4' },
  saffron: { rich: '#D4830A', soft: '#E8A848' },
  steel: { rich: '#4A6FA5', soft: '#7894C0' },
  jade: { rich: '#147D64', soft: '#52B49A' },
  indigo: { rich: '#3D4A9A', soft: '#7784D4' },
  coral: { rich: '#C8544F', soft: '#E4867E' },
  graphite: { rich: '#3F4A57', soft: '#7E8996' },
} as const;
