import { render } from '@testing-library/react-native';
import React from 'react';
import { TextInput } from 'react-native';

import { Box } from '@/components/ui/box';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

describe('Box', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Box>
        <Text>hello</Text>
      </Box>,
    );
    expect(getByText('hello')).toBeTruthy();
  });
});

describe('Text variants', () => {
  it('renders h1 variant without crashing', () => {
    const { getByText } = render(<Text variant="h1">Title</Text>);
    expect(getByText('Title')).toBeTruthy();
  });

  it('renders body (default) variant', () => {
    const { getByText } = render(<Text>Body text</Text>);
    expect(getByText('Body text')).toBeTruthy();
  });

  it('renders hero variant', () => {
    const { getByText } = render(<Text variant="hero">Hero</Text>);
    expect(getByText('Hero')).toBeTruthy();
  });

  it('renders title variant', () => {
    const { getByText } = render(<Text variant="title">Title</Text>);
    expect(getByText('Title')).toBeTruthy();
  });

  it('renders hint variant', () => {
    const { getByText } = render(<Text variant="hint">Hint</Text>);
    expect(getByText('Hint')).toBeTruthy();
  });

  it('renders caption variant', () => {
    const { getByText } = render(<Text variant="caption">Caption</Text>);
    expect(getByText('Caption')).toBeTruthy();
  });
});

describe('Pressable', () => {
  it('renders children and accepts onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Pressable onPress={onPress}>
        <Text>tap me</Text>
      </Pressable>,
    );
    expect(getByText('tap me')).toBeTruthy();
  });
});

describe('Input', () => {
  it('renders a TextInput without label or helper', () => {
    const { UNSAFE_getByType } = render(<Input placeholder="Enter text" />);
    expect(UNSAFE_getByType(TextInput)).toBeTruthy();
  });

  it('renders label and helper text when provided', () => {
    const { getByText } = render(
      <Input label="Account Name" helperText="Required" placeholder="Name" />,
    );
    expect(getByText('Account Name')).toBeTruthy();
    expect(getByText('Required')).toBeTruthy();
  });

  it('renders helper text when isInvalid is true', () => {
    const { getByText } = render(
      <Input isInvalid helperText="This field is required" placeholder="Name" />,
    );
    expect(getByText('This field is required')).toBeTruthy();
  });

  it('shows helperText in error state via isInvalid', () => {
    const { getByText } = render(
      <Input isInvalid helperText="Error via isInvalid" placeholder="Name" />,
    );
    expect(getByText('Error via isInvalid')).toBeTruthy();
  });
});
