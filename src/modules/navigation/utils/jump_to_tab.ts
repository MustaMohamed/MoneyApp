import { router } from 'expo-router';
import {
  type NavigationProp,
  type NavigationState,
  StackActions,
} from 'expo-router/react-navigation';

import { backgroundTabPushedStackKey } from '../domain/stacked_route';

type AppStackNavigation = Pick<NavigationProp<ReactNavigation.RootParamList>, 'dispatch'> & {
  getState: () => NavigationState | undefined;
};

/** Lands on `tabName`'s list from a screen on the `(app)` Stack; `navigation` is that Stack's. */
export function jumpToTab(
  navigation: AppStackNavigation,
  tabName: 'transactions' | 'commitments',
): void {
  const tabHref = `/(app)/(tabs)/${tabName}` as const;
  // From another tab the landing pushes a second list over the tab's own detail, so that Stack pops first.
  const tabStack = backgroundTabPushedStackKey(navigation.getState(), tabName);
  if (tabStack !== undefined) {
    navigation.dispatch({ ...StackActions.popToTop(), target: tabStack });
  }
  // The second `dismissTo` pops the landed tab's own Stack, where the href only diverges once the first has run.
  router.dismissTo(tabHref);
  router.dismissTo(tabHref);
}
