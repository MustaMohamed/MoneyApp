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
