import { stripNameEdges } from '@/utils/strip_name_edges';

describe('stripNameEdges', () => {
  it('reduces a name of spaces, tabs and newlines to empty', () => {
    expect(stripNameEdges('  \t\n')).toBe('');
  });

  it('strips leading and trailing whitespace', () => {
    expect(stripNameEdges(' ab \n')).toBe('ab');
  });

  it('keeps inner spaces as typed', () => {
    expect(stripNameEdges('a  b')).toBe('a  b');
  });

  it('keeps non-breaking spaces', () => {
    expect(stripNameEdges('  ')).toBe('  ');
  });
});
