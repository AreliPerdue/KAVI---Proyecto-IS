import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { groupByDay } from './group-by-day';
import { Timeline, type TimelineProps } from './timeline';

import { threeDays } from '@/lib/dates';
import type { Activity } from '@/types/domain';

export type ThreeDaysViewProps = {
  anchor: Date;
  activities: readonly Activity[];
  onPressSlot: (day: Date, minutes: number) => void;
  onPressActivity: (activity: Activity) => void;
  isSharedActivity?: (activity: Activity) => boolean;
  onScroll?: TimelineProps['onScroll'];
};

/**
 * Vista de tres días: la misma rejilla de la semanal con tres columnas.
 *
 * Existe porque en un teléfono la semana reparte 7 columnas en 390 px y cada bloque
 * queda demasiado angosto para leer su título; con tres, el texto vuelve a caber sin
 * perder la comparación entre días que la vista diaria no da. Empieza en el día ancla
 * y no en el lunes: aquí lo que importa es "hoy y lo que viene".
 */
export function ThreeDaysView({ anchor, activities, onPressSlot, onPressActivity, isSharedActivity, onScroll }: ThreeDaysViewProps) {
  const { width } = useWindowDimensions();
  const days = useMemo(() => threeDays(anchor), [anchor]);
  const byDay = useMemo(() => groupByDay(activities), [activities]);
  return (
    <Timeline
      days={days}
      activitiesByDay={byDay}
      onPressSlot={onPressSlot}
      onPressActivity={onPressActivity}
      /*
       * Más apretado que la semanal a propósito. Con tres columnas sobra ancho y lo que
       * escasea es alto: comprimiendo la hora caben ~25 % más horas de un vistazo, y los
       * bloques siguen legibles porque el ancho no es el que aprieta. Es el único sitio
       * donde ese intercambio sale a favor.
       */
      hourHeight={width >= 1024 ? 48 : 40}
      isSharedActivity={isSharedActivity}
      onScroll={onScroll}
    />
  );
}
