import React from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';

export default function PrimitivesPreview() {
  if (!__DEV__) return null;

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text variant="title" className="mb-6">
        Primitives Preview
      </Text>

      <Text variant="body" className="mb-2">
        Box
      </Text>
      <Box className="bg-surface rounded-[12px] p-4 mb-6">
        <Text>Inside Box — bg-surface</Text>
      </Box>

      <Text variant="body" className="mb-2">
        Text variants
      </Text>
      <Text variant="hero" className="mb-1">
        Hero (32px Sora bold)
      </Text>
      <Text variant="title" className="mb-1">
        Title (20px Sora semibold)
      </Text>
      <Text variant="body" className="mb-1">
        Body (15px Inter)
      </Text>
      <Text variant="caption" className="mb-1">
        Caption (11px Inter muted)
      </Text>
      <Text variant="hint" className="mb-6">
        Hint (12px Inter muted)
      </Text>

      <Text variant="body" className="mb-2">
        Button variants
      </Text>
      <Button
        variant="primary"
        label="Primary CTA (gold gradient)"
        className="mb-3"
        onPress={() => {}}
      />
      <Button
        variant="ghost"
        label="Ghost (border + transparent)"
        className="mb-3"
        onPress={() => {}}
      />
      <Button
        variant="danger"
        label="Danger (HeroUI danger variant)"
        className="mb-6"
        onPress={() => {}}
      />

      <Text variant="body" className="mb-2">
        Input
      </Text>
      <Input placeholder="Normal state — field border" className="mb-3" />
      <Input placeholder="Error state — invalid border" hasError className="mb-6" />

      <Text variant="body" className="mb-2">
        Pressable
      </Text>
      <Pressable className="bg-surface-secondary rounded-[12px] p-4 mb-8">
        <Text>Press me — opacity 0.7 feedback, hitSlop 12</Text>
      </Pressable>
    </ScrollView>
  );
}
