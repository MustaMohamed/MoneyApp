import { render } from '@testing-library/react-native';

import { DateHeader } from '@/modules/transactions/screens/transactions/components/date_header';

jest.mock('heroui-native', () => ({
  cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
}));

describe('DateHeader', () => {
  it('renders the date label', async () => {
    const { getByText } = await render(<DateHeader label="Today" />);

    expect(getByText('Today')).toBeTruthy();
  });
});
