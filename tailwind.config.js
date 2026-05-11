require('tsx/cjs');

const {
  CoreTokens,
  GoldTokens,
  SemanticTokens,
  AccentTokens,
  AcctTokens,
} = require('./constants/theme_tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './screens/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: CoreTokens.bg,
        surface: CoreTokens.surface,
        surfaceEl: CoreTokens.surfaceEl,
        border: CoreTokens.border,
        text1: CoreTokens.text1,
        text2: CoreTokens.text2,
        text3: CoreTokens.text3,
        hint: CoreTokens.hint,
        gold: {
          400: GoldTokens[400],
          500: GoldTokens[500],
          600: GoldTokens[600],
          700: GoldTokens[700],
        },
        positive: SemanticTokens.positive,
        negative: SemanticTokens.negative,
        warning: SemanticTokens.warning,
        info: SemanticTokens.info,
        nile: AccentTokens.nile,
        spice: AccentTokens.spice,
        lapis: AccentTokens.lapis,
        sand: AccentTokens.sand,
        acct: {
          midnight: AcctTokens.midnight,
          gold: AcctTokens.gold,
          nile: AcctTokens.nile,
          paprika: AcctTokens.paprika,
          plum: AcctTokens.plum,
          lapis: AcctTokens.lapis,
          rose: AcctTokens.rose,
          sand: AcctTokens.sand,
          amethyst: AcctTokens.amethyst,
          emerald: AcctTokens.emerald,
          saffron: AcctTokens.saffron,
          steel: AcctTokens.steel,
        },
      },
      fontFamily: {
        sora: ['Sora_400Regular'],
        soraSemi: ['Sora_600SemiBold'],
        soraBold: ['Sora_700Bold'],
        soraExtra: ['Sora_800ExtraBold'],
        inter: ['Inter_400Regular'],
        interMedium: ['Inter_500Medium'],
        interSemi: ['Inter_600SemiBold'],
      },
    },
  },
  plugins: [],
};
