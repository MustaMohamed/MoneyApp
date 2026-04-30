/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams:
        | { pathname: Router.RelativePathString; params?: Router.UnknownInputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownInputParams }
        | { pathname: `/`; params?: Router.UnknownInputParams }
        | { pathname: `/dashboard`; params?: Router.UnknownInputParams }
        | { pathname: `/(onboarding)`; params?: Router.UnknownInputParams }
        | { pathname: `/(onboarding)/welcome`; params?: Router.UnknownInputParams }
        | { pathname: `/(onboarding)/currency`; params?: Router.UnknownInputParams }
        | { pathname: `/(onboarding)/security`; params?: Router.UnknownInputParams }
        | {
            pathname: `/(onboarding)/add_account`;
            params?: { isAddingMore?: string } & Router.UnknownInputParams;
          }
        | { pathname: `/(onboarding)/more_accounts`; params?: Router.UnknownInputParams }
        | { pathname: `/(onboarding)/ready`; params?: Router.UnknownInputParams };
      hrefOutputParams:
        | { pathname: Router.RelativePathString; params?: Router.UnknownOutputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownOutputParams }
        | { pathname: `/`; params?: Router.UnknownOutputParams }
        | { pathname: `/dashboard`; params?: Router.UnknownOutputParams }
        | { pathname: `/(onboarding)`; params?: Router.UnknownOutputParams }
        | { pathname: `/(onboarding)/welcome`; params?: Router.UnknownOutputParams }
        | { pathname: `/(onboarding)/currency`; params?: Router.UnknownOutputParams }
        | { pathname: `/(onboarding)/security`; params?: Router.UnknownOutputParams }
        | {
            pathname: `/(onboarding)/add_account`;
            params?: { isAddingMore?: string } & Router.UnknownOutputParams;
          }
        | { pathname: `/(onboarding)/more_accounts`; params?: Router.UnknownOutputParams }
        | { pathname: `/(onboarding)/ready`; params?: Router.UnknownOutputParams };
      href:
        | Router.RelativePathString
        | Router.ExternalPathString
        | `/`
        | `/dashboard`
        | `/(onboarding)`
        | `/(onboarding)/welcome`
        | `/(onboarding)/currency`
        | `/(onboarding)/security`
        | `/(onboarding)/add_account`
        | `/(onboarding)/more_accounts`
        | `/(onboarding)/ready`
        | { pathname: Router.RelativePathString; params?: Router.UnknownInputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownInputParams }
        | { pathname: `/`; params?: Router.UnknownInputParams }
        | { pathname: `/dashboard`; params?: Router.UnknownInputParams }
        | { pathname: `/(onboarding)`; params?: Router.UnknownInputParams }
        | { pathname: `/(onboarding)/welcome`; params?: Router.UnknownInputParams }
        | { pathname: `/(onboarding)/currency`; params?: Router.UnknownInputParams }
        | { pathname: `/(onboarding)/security`; params?: Router.UnknownInputParams }
        | {
            pathname: `/(onboarding)/add_account`;
            params?: { isAddingMore?: string } & Router.UnknownInputParams;
          }
        | { pathname: `/(onboarding)/more_accounts`; params?: Router.UnknownInputParams }
        | { pathname: `/(onboarding)/ready`; params?: Router.UnknownInputParams };
    }
  }
}
