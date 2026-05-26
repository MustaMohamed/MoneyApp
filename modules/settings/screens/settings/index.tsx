import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListGroup } from 'heroui-native';
import { View } from 'react-native';

import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

import { useSettings } from './settings.hook';

export default function SettingsScreen() {
  const { goToCurrency, goToCategories, goToAbout } = useSettings();

  return (
    <Screen edges={['bottom']}>
      <ScreenScroll
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32, paddingHorizontal: Spacing.md }}
      >
        <ListGroup>
          <ListGroup.Item onPress={goToCurrency} accessibilityRole="button">
            <ListGroup.ItemPrefix>
              <MaterialCommunityIcons name="currency-usd" size={ms(20)} color={CoreTokens.text2} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{Strings.settingsCurrencyRow}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {Strings.settingsCurrencyDescription}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                <Text style={{ color: CoreTokens.text2 }}>
                  {Strings.settingsCurrencyValue('EGP')}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={ms(20)}
                  color={CoreTokens.text2}
                />
              </View>
            </ListGroup.ItemSuffix>
          </ListGroup.Item>

          <ListGroup.Item onPress={goToCategories} accessibilityRole="button">
            <ListGroup.ItemPrefix>
              <MaterialCommunityIcons name="tag-multiple" size={ms(20)} color={CoreTokens.text2} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{Strings.settingsCategoriesRow}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {Strings.settingsCategoriesDescription}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <MaterialCommunityIcons name="chevron-right" size={ms(20)} color={CoreTokens.text2} />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>

          <ListGroup.Item onPress={goToAbout} accessibilityRole="button">
            <ListGroup.ItemPrefix>
              <MaterialCommunityIcons
                name="information-outline"
                size={ms(20)}
                color={CoreTokens.text2}
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{Strings.aboutTitle}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {Strings.settingsAboutDescription}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <MaterialCommunityIcons name="chevron-right" size={ms(20)} color={CoreTokens.text2} />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>
      </ScreenScroll>
    </Screen>
  );
}
