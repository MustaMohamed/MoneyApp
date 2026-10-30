import { Typography } from 'heroui-native';
import React from 'react';

import {
  ListHero,
  ListHeroCaptionFitLine,
  ListHeroCaptionFixedLine,
} from '@/components/ui/list_hero';
import { lineHeightFor } from '@/constants/theme';

import {
  type CommitmentsHeroModel,
  buildCommitmentsListHeroModel,
} from './commitments_hero.helpers';

export function CommitmentsHero({ model }: { model: CommitmentsHeroModel }): React.ReactElement {
  const hasRightLine = model.captionTrail !== undefined;
  return (
    <ListHero
      model={buildCommitmentsListHeroModel(model)}
      testID="commitments-hero"
      renderCaption={(geometry) => (
        <>
          <ListHeroCaptionFitLine geometry={geometry}>{model.percent}</ListHeroCaptionFitLine>
          {hasRightLine ? (
            <ListHeroCaptionFixedLine geometry={geometry}>
              {model.carried !== undefined ? (
                <Typography
                  allowFontScaling={false}
                  className="text-danger"
                  style={{ fontSize: geometry.chip, lineHeight: lineHeightFor(geometry.chip) }}
                >
                  {model.carried}
                </Typography>
              ) : null}
              {model.captionTrail}
            </ListHeroCaptionFixedLine>
          ) : null}
        </>
      )}
    />
  );
}
