import { resolveSheetSizeAboveOne, resolveSnapPoints } from '@/components/ui/sheet.helpers';

describe('resolveSheetSizeAboveOne', () => {
  it.each([1, 0.85])('keeps sm at font scale %s', (fontScale) => {
    expect(resolveSheetSizeAboveOne('sm', fontScale)).toBe('sm');
  });

  it.each([1.01, 2])('steps sm to md at font scale %s', (fontScale) => {
    expect(resolveSheetSizeAboveOne('sm', fontScale)).toBe('md');
  });

  it('steps md to lg at font scale 2', () => {
    expect(resolveSheetSizeAboveOne('md', 2)).toBe('lg');
  });

  it('keeps xxl, the last size, at font scale 2', () => {
    expect(resolveSheetSizeAboveOne('xxl', 2)).toBe('xxl');
  });

  it('takes the named size above font scale 1 and the base size at 1', () => {
    expect(resolveSheetSizeAboveOne('sm', 2, 'lg')).toBe('lg');
    expect(resolveSheetSizeAboveOne('sm', 1, 'lg')).toBe('sm');
  });
});

describe('resolveSnapPoints', () => {
  it('MA-163: the seven sizes ascend along the steps resolveSheetSizeAboveOne takes', () => {
    const percent = (size: Parameters<typeof resolveSheetSizeAboveOne>[0]) =>
      Number.parseFloat(String(resolveSnapPoints(size, undefined)[0]));
    const steps = [percent('xxs')];
    let size: Parameters<typeof resolveSheetSizeAboveOne>[0] = 'xxs';
    while (resolveSheetSizeAboveOne(size, 2) !== size) {
      size = resolveSheetSizeAboveOne(size, 2);
      steps.push(percent(size));
    }

    expect(size).toBe('xxl');
    expect(steps).toStrictEqual([25, 35, 45, 60, 75, 85, 95]);
  });

  it('xxs preset resolves to 25%', () => {
    expect(resolveSnapPoints('xxs', undefined)).toEqual(['25%']);
  });

  it('xs preset resolves to 35%', () => {
    expect(resolveSnapPoints('xs', undefined)).toEqual(['35%']);
  });

  it('sm preset resolves to 45%', () => {
    expect(resolveSnapPoints('sm', undefined)).toEqual(['45%']);
  });

  it('md preset resolves to 60%', () => {
    expect(resolveSnapPoints('md', undefined)).toEqual(['60%']);
  });

  it('lg preset resolves to 75%', () => {
    expect(resolveSnapPoints('lg', undefined)).toEqual(['75%']);
  });

  it('xl preset resolves to 85%', () => {
    expect(resolveSnapPoints('xl', undefined)).toEqual(['85%']);
  });

  it('xxl preset resolves to 95%', () => {
    expect(resolveSnapPoints('xxl', undefined)).toEqual(['95%']);
  });

  it('defaults to lg (75%) when size is undefined', () => {
    expect(resolveSnapPoints(undefined, undefined)).toEqual(['75%']);
  });

  it('explicit snapPoints override size', () => {
    expect(resolveSnapPoints('sm', ['40%'])).toEqual(['40%']);
  });

  it('explicit multi-stop snapPoints are preserved', () => {
    expect(resolveSnapPoints('lg', ['45%', '92%'])).toEqual(['45%', '92%']);
  });

  it('explicit snapPoints override when size is undefined', () => {
    expect(resolveSnapPoints(undefined, ['60%'])).toEqual(['60%']);
  });

  it('explicit snapPoints override new xl size', () => {
    expect(resolveSnapPoints('xl', ['80%'])).toEqual(['80%']);
  });

  it('snapPoints size token resolves to its percentage', () => {
    expect(resolveSnapPoints(undefined, ['sm'])).toEqual(['45%']);
  });

  it('multi-stop size tokens resolve each', () => {
    expect(resolveSnapPoints(undefined, ['sm', 'xl'])).toEqual(['45%', '85%']);
  });

  it('mixed size token + raw percentage', () => {
    expect(resolveSnapPoints('lg', ['xs', '92%'])).toEqual(['35%', '92%']);
  });

  it('pixel-number snap points pass through', () => {
    expect(resolveSnapPoints(undefined, [400])).toEqual([400]);
  });
});
