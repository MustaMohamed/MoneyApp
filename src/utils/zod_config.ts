import { z } from 'zod';

import { Strings } from '@/constants/strings';

z.config({
  customError: (issue) => {
    switch (issue.code) {
      case 'too_small':
        return {
          message:
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- $ZodRawIssue has 'minimum' at runtime for too_small issues; not exposed in the public type
            (issue as { minimum?: number }).minimum === 1
              ? Strings.errRequired
              : Strings.errTooShort,
        };
      case 'too_big':
        return { message: Strings.errTooLong };
      default:
        return { message: Strings.errInvalid };
    }
  },
});
