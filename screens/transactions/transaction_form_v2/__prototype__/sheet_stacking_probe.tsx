import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button } from 'heroui-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function SheetStackingProbe(): React.ReactElement {
  const [outerOpen, setOuterOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);

  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-6 gap-4">
        <Text className="font-sora font-semibold text-foreground text-[15px]">
          BottomSheet stacking probe
        </Text>
        <Button onPress={() => setOuterOpen(true)}>Open outer sheet</Button>
      </View>

      <BottomSheet isOpen={outerOpen} onOpenChange={setOuterOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={['80%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
          >
            <BottomSheet.Close />
            <BottomSheet.Title>Outer sheet</BottomSheet.Title>
            <View className="flex-1 items-center justify-center px-6">
              <Button onPress={() => setInnerOpen(true)}>Open picker over me</Button>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      <BottomSheet isOpen={innerOpen} onOpenChange={setInnerOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={['60%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
          >
            <BottomSheet.Close />
            <BottomSheet.Title>Inner picker</BottomSheet.Title>
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-foreground">
                If you can read this on top of the outer sheet, stacking works.
              </Text>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </Screen>
  );
}
