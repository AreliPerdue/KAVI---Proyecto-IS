import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { groupByDay } from './group-by-day';
import { Timeline } from './timeline';

import { weekDays } from '@/lib/dates';
import type { Activity } from '@/types/domain';

export type WeekViewProps = {
  anchor: Date;
  activities: readonly Activity[];
  onPressSlot: (day: Date, minutes: number) => void;
  onPressActivity: (activity: Activity) => void;
  isSharedActivity?: (activity: Activity) => boolean;
};

/** Vista semanal: 7 columnas con bloques (RF-C2). Compacta en pantallas angostas (NFR-9). */
export function WeekView({ anchor, activities, onPressSlot, onPressActivity, isSharedActivity }: WeekViewProps) {
  const { width } = useWindowDimensions();
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const byDay = useMemo(() => groupByDay(activities), [activities]);
  return (
    <Timeline
      days={days}
      activitiesByDay={byDay}
      onPressSlot={onPressSlot}
      onPressActivity={onPressActivity}
      hourHeight={width >= 1024 ? 56 : 48}
      compact={width < 768}
      isSharedActivity={isSharedActivity}
    />
  );
}
