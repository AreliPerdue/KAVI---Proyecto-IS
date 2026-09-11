import { useMemo } from 'react';

import { groupByDay } from './group-by-day';
import { Timeline } from './timeline';

import type { Activity } from '@/types/domain';

export type DayViewProps = {
  day: Date;
  activities: readonly Activity[];
  onPressSlot: (day: Date, minutes: number) => void;
  onPressActivity: (activity: Activity) => void;
  isSharedActivity?: (activity: Activity) => boolean;
};

/** Vista diaria: timeline con bloques posicionados (RF-C3). */
export function DayView({ day, activities, onPressSlot, onPressActivity, isSharedActivity }: DayViewProps) {
  const days = useMemo(() => [day], [day]);
  const byDay = useMemo(() => groupByDay(activities), [activities]);
  return (
    <Timeline
      days={days}
      activitiesByDay={byDay}
      onPressSlot={onPressSlot}
      onPressActivity={onPressActivity}
      hourHeight={64}
      titleOnly
      isSharedActivity={isSharedActivity}
    />
  );
}
