import React from 'react';
import { render } from '@testing-library/react-native';

import { NoteCard } from '@/screens/transactions/detail/components/note_card';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

describe('NoteCard', () => {
  it('renders the note text when a note is present', () => {
    const { getByText, getByTestId } = render(
      <NoteCard note="Team lunch downtown — split four ways" />,
    );
    expect(getByText('Team lunch downtown — split four ways')).toBeTruthy();
    // Card wrapper exists, so the dedicated section IS being rendered (not
    // just the text floating somewhere).
    expect(getByTestId('detail-note-card')).toBeTruthy();
  });

  it('renders nothing (null) when note is null', () => {
    // Behavior contract: no placeholder card for empty note — the Edit
    // sheet is where users add a note, an empty card here would just be
    // visual noise.
    const { queryByTestId } = render(<NoteCard note={null} />);
    expect(queryByTestId('detail-note-card')).toBeNull();
  });

  it('renders nothing when note is whitespace-only', () => {
    // Treat whitespace-only note as effectively empty. The {...} wrapper
    // is intentional — JSX attribute strings don't interpret '\n' as a
    // newline, so we have to pass a JS expression for it to be a real
    // whitespace character.
    const { queryByTestId } = render(<NoteCard note={'   \n  '} />);
    expect(queryByTestId('detail-note-card')).toBeNull();
  });

  it('does NOT cap the note to a fixed number of lines', () => {
    // The whole point of moving the note OUT of the rows card was to let
    // long notes wrap fully instead of being chopped to 2 lines like
    // every other DetailRow. The Text node must NOT have numberOfLines.
    const longNote =
      'A very long note that goes on and on about the transaction context. ' +
      'It might include who else was there, what was discussed, how the bill ' +
      'was split, and any follow-ups required.';
    const { getByText } = render(<NoteCard note={longNote} />);
    const node = getByText(longNote);
    expect(node.props.numberOfLines).toBeUndefined();
  });

  it('trims surrounding whitespace from the displayed note', () => {
    const { getByText } = render(<NoteCard note="   trimmed note   " />);
    expect(getByText('trimmed note')).toBeTruthy();
  });
});
