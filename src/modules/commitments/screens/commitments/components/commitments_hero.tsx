import { Typography } from 'heroui-native';
import React from 'react';

import { ListHero } from '@/components/ui/list_hero';
import { lineHeightFor } from '@/constants/theme';

import {
  type CommitmentsHeroModel,
  buildCommitmentsListHeroModel,
} from './commitments_hero.helpers';

export function CommitmentsHero({ model }: { model: CommitmentsHeroModel }): React.ReactElement {
  const hasRightLine = model.carried !== undefined || model.captionTrail !== undefined;
  return (
    <ListHero
      model={buildCommitmentsListHeroModel(model)}
      testID="commitments-hero"
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
            {model.percent}
          </Typography>
          {hasRightLine ? (
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
            </Typography>
          ) : null}
        </>
      )}
    />
  );
}
