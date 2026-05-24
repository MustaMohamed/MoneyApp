// Ambient declaration for CSS side-effect imports (e.g. `import '../global.css'`
// in app/_layout.tsx). Expo normally provides this via the generated
// `expo-env.d.ts`, but that file is gitignored and is NOT generated in CI before
// the type-aware lint runs — so oxlint-tsgolint reports TS2882. This committed
// declaration makes the side-effect css import resolve in every environment
// (CI, fresh worktrees) without depending on the generated file.
declare module '*.css';
