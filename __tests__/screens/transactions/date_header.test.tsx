import { render } from '@testing-library/react-native';

import { DateHeader } from '@/modules/transactions/screens/transactions/components/date_header';

jest.mock('heroui-native', () => ({
  cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
}));

describe('DateHeader', () => {
  it('renders only the date label when no context is provided', async () => {
    const { getByText, queryByText } = await render(<DateHeader label="Today" />);

    expect(getByText('Today')).toBeTruthy();
    expect(queryByText('CIB + Food')).toBeNull();
  });

  it('renders right-aligned applied-filter context when provided', async () => {
    const { getByText } = await render(<DateHeader label="Today" contextLabel="CIB + Food" />);

    expect(getByText('Today')).toBeTruthy();
    expect(getByText('CIB + Food')).toBeTruthy();
  });
});
