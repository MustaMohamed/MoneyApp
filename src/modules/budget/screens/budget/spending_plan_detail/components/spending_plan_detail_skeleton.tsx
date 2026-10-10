import { Card, SkeletonGroup } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { ScaledBar } from '@/components/ui/skeleton_bar';

const CATEGORY_ROWS = [0, 1, 2];

export function SpendingPlanDetailSkeleton(): React.ReactElement {
  return (
    <SkeletonGroup isLoading isSkeletonOnly>
      <Card
        className="bg-surface border-border mx-4 mt-3 rounded-xl border p-0"
        style={{ boxShadow: 'none' }}
      >
        <Card.Body className="px-2 py-1.5">
          <View className="flex-row justify-between gap-3">
            <View className="flex-1 gap-1">
              <ScaledBar height={31} className="w-[55%] rounded-lg" />
              <ScaledBar height={13} className="w-[68%] rounded-lg" />
            </View>
            <ScaledBar height={24} className="w-16 rounded-full" />
          </View>
          <View className="mt-1 flex-row justify-between">
            <ScaledBar height={14} className="w-[45%] rounded-lg" />
            <ScaledBar height={13} className="w-[20%] rounded-lg" />
          </View>
          <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-lg" />
          <View className="mt-1.5 flex-row gap-2">
            {[0, 1, 2, 3].map((metric) => (
              <ScaledBar key={metric} height={32} className="flex-1 rounded-lg" />
            ))}
          </View>
          <View className="mt-1.5 flex-row gap-1">
            <ScaledBar
              testID="plan-detail-insight-skeleton"
              height={32}
              className="flex-1 rounded-lg"
            />
          </View>
        </Card.Body>
      </Card>
      <View className="mt-3 flex-row justify-between px-4">
        <ScaledBar height={13} className="w-20 rounded-lg" />
        <ScaledBar height={13} className="w-16 rounded-lg" />
      </View>
      {CATEGORY_ROWS.map((row) => (
        <View key={row} className="min-h-[52px] flex-row items-center gap-2 px-4 py-1">
          <SkeletonGroup.Item className="h-7 w-7 rounded-full" />
          <View className="flex-1 gap-1">
            <ScaledBar height={15} className="w-[65%] rounded-lg" />
            <ScaledBar height={11.5} className="w-1/2 rounded-lg" />
          </View>
          <ScaledBar height={15} className="w-16 rounded-lg" />
        </View>
      ))}
    </SkeletonGroup>
  );
}
