import Constants from 'expo-constants';

interface AboutState {
  version: string;
  build: string;
}

interface UseAboutReturn {
  state: AboutState;
}

export function useAbout(): UseAboutReturn {
  const version = Constants.expoConfig?.version ?? '—';
  const build =
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- expoConfig.extra is Record<string,unknown>; buildNumber is always a string when present
    (Constants.expoConfig?.extra?.buildNumber as string | undefined) ??
    Constants.expoConfig?.version ??
    '—';

  return {
    state: {
      version,
      build,
    },
  };
}
