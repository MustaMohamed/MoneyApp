import { Screen, ScreenScroll } from '@/components/ui/screen';
import { SettingsSection } from '@/components/ui/settings_section';
import { Strings } from '@/constants/strings';
import { useSettings } from './settings.hook';

export default function SettingsScreen() {
  const { goToCurrency, goToCategories, goToAbout } = useSettings();

  return (
    <Screen edges={['bottom']}>
      <ScreenScroll contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}>
        <SettingsSection
          title={Strings.settingsGroupPreferences}
          items={[
            {
              label: Strings.settingsCurrencyRow,
              icon: 'currency-usd',
              value: Strings.settingsCurrencyValue('EGP'),
              trailing: 'chevron',
              onPress: goToCurrency,
            },
          ]}
        />
        <SettingsSection
          title={Strings.settingsGroupData}
          items={[
            {
              label: Strings.settingsCategoriesRow,
              icon: 'tag-multiple',
              trailing: 'chevron',
              onPress: goToCategories,
            },
          ]}
        />
        <SettingsSection
          title={Strings.settingsGroupAbout}
          items={[
            {
              label: Strings.aboutTitle,
              icon: 'information-outline',
              trailing: 'chevron',
              onPress: goToAbout,
            },
          ]}
        />
      </ScreenScroll>
    </Screen>
  );
}
