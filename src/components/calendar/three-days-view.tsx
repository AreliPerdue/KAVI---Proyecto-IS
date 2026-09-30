import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { groupByDay } from './group-by-day';
import { Timeline } from './timeline';

import { threeDays } from '@/lib/dates';
import type { Activity } from '@/types/domain';

export type ThreeDaysViewProps = {
  anchor: Date;
  activities: readonly Activity[];
  onPressSlot: (day: Date, minutes: number) => void;
  onPressActivity: (activity: Activity) => void;
  isSharedActivity?: (activity: Activity) => boolean;
};

/**
 * Vista de tres días: la misma rejilla de la semanal con tres columnas.
 *
 * Existe porque en un teléfono la semana reparte 7 columnas en 390 px y cada bloque
 * queda demasiado angosto para leer su título; con tres, el texto vuelve a caber sin
 * perder la comparación entre días que la vista diaria no da. Empieza en el día ancla
 * y no en el lunes: aquí lo que importa es "hoy y lo que viene".
 */
export function ThreeDaysView({ anchor, activities, onPressSlot, onPressActivity, isSharedActivity }: ThreeDaysViewProps) {
  const { width } = useWindowDimensions();
  const days = useMemo(() => threeDays(anchor), [anchor]);
  const byDay = useMemo(() => groupByDay(activities), [activities]);
  return (
    <Timeline
      days={days}
      activitiesByDay={byDay}
      onPressSlot={onPressSlot}
      onPressActivity={onPressActivity}
      hourHeight={width >= 1024 ? 56 : 48}
      isSharedActivity={isSharedActivity}
    />
  );
}
