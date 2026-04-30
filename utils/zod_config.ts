import { z } from 'zod';
import { Strings } from '@/constants/strings';

z.setErrorMap((issue) => {
  switch (issue.code) {
    case 'too_small':
      return {
        message:
          (issue as { minimum?: number }).minimum === 1 ? Strings.errRequired : Strings.errTooShort,
      };
    case 'too_big':
      return { message: Strings.errTooLong };
    default:
      return { message: Strings.errInvalid };
  }
});
