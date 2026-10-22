import type { ComponentProps } from 'react';

import { AmountRangeFilterContent } from '@/components/ui/filter_accordion';
import { FilterAmountAccordion } from '@/components/ui/filter_amount_accordion';

// An optional key reads false; a required key reads true, whatever values it allows.
type IsRequired<P, K extends keyof P> = Partial<Pick<P, K>> extends Pick<P, K> ? false : true;

type SectionProps = ComponentProps<typeof FilterAmountAccordion>;
type ContentProps = ComponentProps<typeof AmountRangeFilterContent>;
type ErrorKey = 'minError' | 'maxError' | 'rangeError';

describe('the Amount section error props', () => {
  it('are required keys at both mounts, each still taking undefined', () => {
    const required: [
      IsRequired<SectionProps, 'minError'>,
      IsRequired<SectionProps, 'maxError'>,
      IsRequired<SectionProps, 'rangeError'>,
      IsRequired<ContentProps, 'minError'>,
      IsRequired<ContentProps, 'maxError'>,
      IsRequired<ContentProps, 'rangeError'>,
    ] = [true, true, true, true, true, true];
    const sectionClear: Pick<SectionProps, ErrorKey> = {
      minError: undefined,
      maxError: undefined,
      rangeError: undefined,
    };
    const contentClear: Pick<ContentProps, ErrorKey> = {
      minError: undefined,
      maxError: undefined,
      rangeError: undefined,
    };

    expect(typeof FilterAmountAccordion).toBe('function');
    expect(typeof AmountRangeFilterContent).toBe('function');
    expect(required).toEqual([true, true, true, true, true, true]);
    expect(Object.keys(sectionClear)).toEqual(Object.keys(contentClear));
  });
});
