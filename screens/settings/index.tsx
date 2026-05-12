import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import { ListGroup } from 'heroui-native';

import { Text } from '@/components/ui/text';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Colors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useSettings } from './settings.hook';

export default function SettingsScreen() {
  const { goToCurrency, goToCategories, goToAbout } = useSettings();

  return (
    <Screen edges={['bottom']}>
      <ScreenScroll contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}>
        {/* PREFERENCES group */}
        <Text
          testID="settings-group-preferences"
          className="text-muted text-xs font-inter-medium uppercase tracking-wider px-4 pb-1 pt-1"
        >
          {Strings.settingsGroupPreferences}
        </Text>
        <ListGroup>
          <ListGroup.Item onPress={goToCurrency} accessibilityRole="button">
            <ListGroup.ItemPrefix>
              <MaterialCommunityIcons
                name="currency-usd"
                size={20}
                color={Colors.dark.text2}
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{Strings.settingsCurrencyRow}</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text className="text-muted text-sm font-inter-regular">
                  {Strings.settingsCurrencyValue('EGP')}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.dark.text2}
                />
              </View>
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>

        {/* DATA group */}
        <View style={{ marginTop: Spacing.lg }}>
          <Text
            testID="settings-group-data"
            className="text-muted text-xs font-inter-medium uppercase tracking-wider px-4 pb-1 pt-1"
          >
            {Strings.settingsGroupData}
          </Text>
          <ListGroup>
            <ListGroup.Item onPress={goToCategories} accessibilityRole="button">
              <ListGroup.ItemPrefix>
                <MaterialCommunityIcons
                  name="tag-multiple"
                  size={20}
                  color={Colors.dark.text2}
                />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{Strings.settingsCategoriesRow}</ListGroup.ItemTitle>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
          </ListGroup>
        </View>

        {/* ABOUT group */}
        <View style={{ marginTop: Spacing.lg }}>
          <Text
            testID="settings-group-about"
            className="text-muted text-xs font-inter-medium uppercase tracking-wider px-4 pb-1 pt-1"
          >
            {Strings.settingsGroupAbout}
          </Text>
          <ListGroup>
            <ListGroup.Item onPress={goToAbout} accessibilityRole="button">
              <ListGroup.ItemPrefix>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={20}
                  color={Colors.dark.text2}
                />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{Strings.aboutTitle}</ListGroup.ItemTitle>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
          </ListGroup>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
