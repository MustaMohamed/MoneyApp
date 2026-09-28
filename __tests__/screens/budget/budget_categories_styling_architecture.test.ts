import { TRANSACTION_FORM_CONTENT_CONTAINER_STYLE } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry';
import { ms } from '@/utils/responsive';

describe('budget categories presentation architecture', () => {
  it('scales transaction form geometry passed through style and icon props', () => {
    expect(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE.gap).toBe(ms(8));
  });
});
