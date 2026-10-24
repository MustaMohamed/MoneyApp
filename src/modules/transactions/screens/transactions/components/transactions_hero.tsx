import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import React, { type ComponentProps } from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';

import type { PolaritySignal } from '@/components/ui/flow_polarity';
import { ListHero } from '@/components/ui/list_hero';
import type { ListHeroGeometry } from '@/components/ui/list_text.geometry';
import { lineHeightFor } from '@/constants/theme';
import type { DeltaDirection } from '@/modules/transactions/utils/totals_presentation';

import {
  buildListHeroModel,
  type TransactionsHeroChange,
  type TransactionsHeroModel,
} from '../transactions.helpers';

// Without `withUniwind` the icon's `styleDefaults` win and its `className` colour is a no-op.
const ChangeIcon = withUniwind(MaterialCommunityIcons);

const CHANGE_ICON: Record<DeltaDirection, ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  up: 'arrow-up',
  down: 'arrow-down',
  flat: 'arrow-right',
};

const CHANGE_CLASS: Record<PolaritySignal, string> = {
  good: 'text-success',
  bad: 'text-danger',
  neutral: 'text-foreground/50',
};

function LastMonthChange({
  change,
  geometry,
}: {
  change: TransactionsHeroChange;
  geometry: ListHeroGeometry;
}): React.ReactElement {
  return (
    <View
      accessible
      accessibilityLabel={change.accessibilityLabel}
      style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}
    >
      <ChangeIcon
        name={CHANGE_ICON[change.direction]}
        size={geometry.caption}
        className={CHANGE_CLASS[change.polarity]}
      />
      <Typography
        allowFontScaling={false}
        numberOfLines={1}
        className={`font-sora-bold tabular-nums ${CHANGE_CLASS[change.polarity]}`}
        style={{ fontSize: geometry.chip, lineHeight: lineHeightFor(geometry.chip) }}
      >
        {change.label}
      </Typography>
    </View>
  );
}

export function TransactionsHero({ model }: { model: TransactionsHeroModel }): React.ReactElement {
  return (
    <ListHero
      model={buildListHeroModel(model)}
      testID="transactions-hero"
      renderCaption={(geometry) => (
        <>
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            className="font-inter text-foreground/55"
            style={{ flex: 1, fontSize: geometry.chip, lineHeight: lineHeightFor(geometry.chip) }}
          >
            {model.shareCaption ?? ''}
          </Typography>
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            className="font-inter text-foreground/55"
            style={{
              flexShrink: 0,
              fontSize: geometry.chip,
              lineHeight: lineHeightFor(geometry.chip),
            }}
          >
            {model.caption}
          </Typography>
          {model.lastMonthChange !== undefined ? (
            <LastMonthChange change={model.lastMonthChange} geometry={geometry} />
          ) : null}
        </>
      )}
    />
  );
}
