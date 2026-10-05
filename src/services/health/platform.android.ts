import { addDays, eachDayOfInterval, format, parseISO } from 'date-fns';
import {
  aggregateRecord,
  ExerciseType,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  revokeAllPermissions,
  SdkAvailabilityStatus,
  type Permission,
} from 'react-native-health-connect';

import { storage } from '@/lib/storage';

import { NO_PERMISSIONS, type DailyTotals, type ExternalSession, type HealthApi, type HealthMetric, type HealthPermissions } from './types';

/**
 * Health Connect en Android (spec 11, T261). Solo lectura (RF-H2) y nada sale del teléfono (S4).
 *
 * Los totales del día salen de `aggregateRecord`, que ya consolida lo que reportan el teléfono y
 * el reloj sin contar dos veces (RF-H5); KAVI no suma registros por su cuenta.
 */

const TIPO: Record<HealthMetric, Permission['recordType']> = {
  steps: 'Steps',
  distance: 'Distance',
  active_calories: 'ActiveCaloriesBurned',
  exercise_sessions: 'ExerciseSession',
};

/**
 * "Desconectar" (RF-H8) retira los permisos, pero Health Connect solo lo aplica al reiniciar la
 * app: hasta entonces los seguiría reportando. Se recuerda aquí que la persona desconectó, para
 * no leer nada aunque la plataforma todavía diga que sí, hasta que vuelva a conectar.
 */
const DESCONECTADO = 'kavi.health.disconnected';

let listo: Promise<boolean> | null = null;
/** `initialize` se llama una vez; si falla, el siguiente intento lo repite. */
function inicializar(): Promise<boolean> {
  listo ??= initialize().catch(() => {
    listo = null;
    return false;
  });
  return listo;
}

async function desconectado(): Promise<boolean> {
  return (await storage.getItem(DESCONECTADO)) === '1';
}

function aPermisos(concedidos: readonly { accessType?: string; recordType?: string }[]): HealthPermissions {
  const leidos = new Set(concedidos.filter((p) => p.accessType === 'read').map((p) => p.recordType));
  return {
    steps: leidos.has('Steps'),
    distance: leidos.has('Distance'),
    active_calories: leidos.has('ActiveCaloriesBurned'),
    exercise_sessions: leidos.has('ExerciseSession'),
  };
}

/** Nombres en español de los tipos que más se registran; el resto cae en "Ejercicio". */
const NOMBRE_TIPO: Partial<Record<number, string>> = {
  [ExerciseType.WALKING]: 'Caminata',
  [ExerciseType.RUNNING]: 'Carrera',
  [ExerciseType.RUNNING_TREADMILL]: 'Caminadora',
  [ExerciseType.BIKING]: 'Ciclismo',
  [ExerciseType.BIKING_STATIONARY]: 'Bicicleta fija',
  [ExerciseType.HIKING]: 'Senderismo',
  [ExerciseType.SWIMMING_POOL]: 'Natación',
  [ExerciseType.SWIMMING_OPEN_WATER]: 'Natación en aguas abiertas',
  [ExerciseType.STRENGTH_TRAINING]: 'Entrenamiento de fuerza',
  [ExerciseType.WEIGHTLIFTING]: 'Levantamiento de pesas',
  [ExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING]: 'HIIT',
  [ExerciseType.YOGA]: 'Yoga',
  [ExerciseType.PILATES]: 'Pilates',
  [ExerciseType.ELLIPTICAL]: 'Elíptica',
  [ExerciseType.ROWING_MACHINE]: 'Remo',
  [ExerciseType.DANCING]: 'Baile',
  [ExerciseType.SOCCER]: 'Futbol',
  [ExerciseType.BASKETBALL]: 'Basquetbol',
  [ExerciseType.TENNIS]: 'Tenis',
  [ExerciseType.BOXING]: 'Box',
  [ExerciseType.MARTIAL_ARTS]: 'Artes marciales',
  [ExerciseType.STRETCHING]: 'Estiramiento',
  [ExerciseType.CALISTHENICS]: 'Calistenia',
  [ExerciseType.STAIR_CLIMBING]: 'Escaleras',
};

/** Las apps más comunes por su paquete; si no la conocemos, no inventamos un nombre. */
const NOMBRE_APP: Record<string, string> = {
  'com.google.android.apps.fitness': 'Google Fit',
  'com.google.android.apps.healthdata': 'Health Connect',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.strava': 'Strava',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.nike.plusgps': 'Nike Run Club',
  'com.huawei.health': 'Huawei Salud',
  'com.xiaomi.wearable': 'Mi Fitness',
};

/** Medianoche local de un día 'yyyy-MM-dd' en ISO, y la del día siguiente. */
function limites(dia: string): { startTime: string; endTime: string } {
  const inicio = parseISO(dia);
  return { startTime: inicio.toISOString(), endTime: addDays(inicio, 1).toISOString() };
}

/** Un total que la persona no permitió leer es `null`, nunca 0 (spec 11). */
async function total<T>(permitido: boolean, leer: () => Promise<T>): Promise<T | null> {
  if (!permitido) return null;
  try {
    return await leer();
  } catch {
    return null;
  }
}

export const platformHealth: HealthApi = {
  async availability() {
    const estado = await getSdkStatus().catch(() => SdkAvailabilityStatus.SDK_UNAVAILABLE);
    if (estado === SdkAvailabilityStatus.SDK_AVAILABLE) return { status: 'available', source: 'health_connect' };
    if (estado === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return { status: 'needs_install', source: null, message: 'Instala o actualiza Health Connect desde Google Play para conectar tu actividad.' };
    }
    return { status: 'unsupported', source: null, message: 'Este teléfono no tiene Health Connect.' };
  },

  async permissions() {
    if ((await desconectado()) || !(await inicializar())) return NO_PERMISSIONS;
    return aPermisos(await getGrantedPermissions().catch(() => []));
  },

  async requestPermissions(metrics) {
    if (!(await inicializar())) return NO_PERMISSIONS;
    await storage.removeItem(DESCONECTADO);
    const concedidos = await requestPermission(metrics.map((m) => ({ accessType: 'read' as const, recordType: TIPO[m] })));
    return aPermisos(concedidos);
  },

  async dailyTotals(fromDay, toDay) {
    const permisos = await platformHealth.permissions();
    const dias = eachDayOfInterval({ start: parseISO(fromDay), end: parseISO(toDay) }).map((d) => format(d, 'yyyy-MM-dd'));
    return Promise.all(
      dias.map(async (dia): Promise<DailyTotals> => {
        const timeRangeFilter = { operator: 'between' as const, ...limites(dia) };
        const [pasos, distancia, kcal] = await Promise.all([
          total(permisos.steps, async () => (await aggregateRecord({ recordType: 'Steps', timeRangeFilter })).COUNT_TOTAL),
          total(permisos.distance, async () => (await aggregateRecord({ recordType: 'Distance', timeRangeFilter })).DISTANCE.inMeters),
          total(permisos.active_calories, async () =>
            Math.round((await aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter })).ACTIVE_CALORIES_TOTAL.inKilocalories),
          ),
        ]);
        return { date: dia, steps: pasos, distanceM: distancia === null ? null : Math.round(distancia), activeKcal: kcal, source: 'health_connect' };
      }),
    );
  },

  async exerciseSessions(fromIso, toIso) {
    const permisos = await platformHealth.permissions();
    if (!permisos.exercise_sessions) return [];
    const { records } = await readRecords('ExerciseSession', {
      timeRangeFilter: { operator: 'between', startTime: fromIso, endTime: toIso },
    });
    return Promise.all(
      records.map(async (r): Promise<ExternalSession> => {
        // Las calorías de la sesión son el total consolidado en su horario, si se permitió leerlas.
        const kcal = await total(permisos.active_calories, async () =>
          Math.round(
            (await aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: { operator: 'between', startTime: r.startTime, endTime: r.endTime } }))
              .ACTIVE_CALORIES_TOTAL.inKilocalories,
          ),
        );
        const origen = r.metadata?.dataOrigin ?? '';
        return {
          id: r.metadata?.id ?? `${r.startTime}-${r.exerciseType}`,
          title: r.title?.trim() || NOMBRE_TIPO[r.exerciseType] || 'Ejercicio',
          startAt: r.startTime,
          endAt: r.endTime,
          activeKcal: kcal || null,
          app: NOMBRE_APP[origen] ?? null,
          source: 'health_connect',
        };
      }),
    );
  },

  async disconnect() {
    await storage.setItem(DESCONECTADO, '1');
    await revokeAllPermissions().catch(() => undefined);
  },
};
