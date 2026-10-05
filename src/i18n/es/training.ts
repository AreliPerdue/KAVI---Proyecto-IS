/**
 * Términos de entrenamiento (spec 07 v2): tipos de serie, intensificadores, agrupaciones,
 * protocolos, equipo de apoyo y etiquetas de notas. El español sale de las constantes, que
 * además guardan lo que no se traduce (alias de búsqueda, si el protocolo lleva timer).
 */
import { SESSION_TAGS, SET_TAGS } from '@/constants/gym-notes';
import { GEAR, GROUP_TYPES, INTENSIFIERS, type IntensifierKey, PROTOCOLS, type ProtocolKey, SET_TYPES } from '@/constants/intensifiers';
import type { PrKind } from '@/lib/gym/records';
import type { ExerciseGroupType, SegmentKind, SetType } from '@/types/domain';

type Texto = { label: string; description: string };

const porClave = <K extends string, V>(filas: readonly V[], clave: (v: V) => K, valor: (v: V) => unknown) =>
  Object.fromEntries(filas.map((f) => [clave(f), valor(f)]));

export const training = {
  setTypes: porClave(SET_TYPES, (t) => t.value, (t) => ({ label: t.label, description: t.description })) as Record<SetType, Texto>,
  intensifiers: porClave(INTENSIFIERS, (i) => i.key, (i) => ({ label: i.label, description: i.description, howTo: i.howTo })) as Record<
    IntensifierKey,
    Texto & { howTo: string }
  >,
  groups: porClave(GROUP_TYPES, (g) => g.value, (g) => ({ label: g.label, description: g.description })) as Record<ExerciseGroupType, Texto>,
  protocols: porClave(PROTOCOLS, (p) => p.key, (p) => ({ label: p.label, description: p.description })) as Record<ProtocolKey, Texto>,
  gear: porClave(GEAR, (g) => g.value, (g) => g.label) as Record<string, string>,
  tags: porClave([...SESSION_TAGS, ...SET_TAGS], (t) => t.value, (t) => t.label) as Record<string, string>,
  /** Nombre corto de un tramo de la serie, en la fila del logger ("↳ drop"). */
  segments: {
    main: 'serie',
    drop: 'drop',
    rest_pause: 'pausa',
    myo_activation: 'activación',
    myo_mini: 'mini',
    cluster: 'cluster',
    forced: 'forzadas',
    negative: 'negativa',
    partials: 'parciales',
    iso_hold: 'isométrico',
    loaded_stretch: 'estiramiento',
    twenty_ones_bottom: '21s abajo',
    twenty_ones_top: '21s arriba',
    twenty_ones_full: '21s completas',
    bfr: 'BFR',
  } as Record<SegmentKind, string>,
  /** Letra de la serie en el logger cuando no es efectiva (la efectiva lleva su número). */
  setTypeShort: { warmup: 'C', feeder: 'A', top_set: 'T', backoff: 'B', failure: 'F', amrap: 'M', technique: 'Té', max_test: '1RM' } as Partial<
    Record<SetType, string>
  >,
  /** Lados en ejercicios unilaterales: izquierda y derecha. */
  left: 'I',
  right: 'D',
  prKinds: { max_weight: 'peso', reps_at_weight: 'reps', e1rm: 'máx. estimado', set_volume: 'volumen' } as Record<PrKind, string>,
};
