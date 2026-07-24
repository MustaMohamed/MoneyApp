# Verification

## Commands

```bash
npx expo prebuild --clean && npx expo run:android   # local dev build
eas build --profile development --platform android  # cloud dev build
npm run test:coverage   # thresholds: 80% lines / 95% functions / 100% branches
```

## Publish readiness

Run `npm run verify:pr` before every authorized push to a PR branch. It executes the six checks registered in `harness/manifest.json` and stops on the first failure. A passing check does not itself authorize a push.

The six CI jobs on `.github/workflows/pr-checks.yml` remain independently observable: format check, lint, typecheck, unit tests, Expo Doctor, and Android prebuild dry-run. If any step fails, fix it and rerun the complete command. Never push hoping CI will catch it.
