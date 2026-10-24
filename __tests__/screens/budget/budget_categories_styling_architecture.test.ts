import { FORM_SHEET_CONTENT_CONTAINER_STYLE } from '@/components/ui/form_sheet.geometry';
import { ms } from '@/utils/responsive';

describe('budget categories presentation architecture', () => {
  it('scales transaction form geometry passed through style and icon props', () => {
    expect(FORM_SHEET_CONTENT_CONTAINER_STYLE.gap).toBe(ms(8));
  });
});
