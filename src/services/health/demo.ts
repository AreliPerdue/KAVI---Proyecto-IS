import { addDays, eachDayOfInterval, format, parseISO, startOfWeek } from 'date-fns';

import { NO_PERMISSIONS, type ExternalSession, type HealthApi, type HealthPermissions } from './types';

/**
 * Datos de ejemplo para el modo demo (spec 11, §4): permiten ver y probar Actividad en web sin
 * un teléfono. Son deterministas por fecha para que no cambien en cada render. Los permisos
 * empiezan en cero, para recorrer "Conecta tu actividad".
 */
let permisos: HealthPermissions = { ...NO_PERMISSIONS };

/** FNV-1a: fechas seguidas dan números muy distintos, como una semana real. */
const semilla = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};
const espera = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function sesiones(): ExternalSession[] {
  // La misma mañana que la sesión "Pierna" del demo de entrenamientos (lunes de la semana pasada,
  // 7:30): el reloj la registró también, así que es la misma sesión (RF-H6).
  const lunesPasado = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), -7);
  const a = (dias: number, h: number, m: number) => {
    const d = addDays(lunesPasado, dias);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const ayer = addDays(new Date(), -1);
  const ayerA = (h: number, m: number) => {
    const d = new Date(ayer);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  return [
    { id: 'hc-fuerza', title: null, kind: 'strength', startAt: a(0, 7, 28), endAt: a(0, 8, 30), activeKcal: 214, app: 'Reloj', source: 'demo' },
    { id: 'hc-bici', title: null, kind: 'biking', startAt: a(3, 18, 0), endAt: a(3, 18, 45), activeKcal: 320, app: 'Strava', source: 'demo' },
    { id: 'hc-caminata', title: null, kind: 'walking', startAt: ayerA(19, 0), endAt: ayerA(19, 40), activeKcal: 145, app: 'Reloj', source: 'demo' },
  ];
}

export const demoHealth: HealthApi = {
  async availability() {
    return { status: 'available', source: 'demo' };
  },
  async permissions() {
    return { ...permisos };
  },
  async requestPermissions(metrics) {
    await espera(300);
    permisos = { ...permisos, ...Object.fromEntries(metrics.map((m) => [m, true])) };
    return { ...permisos };
  },
  async dailyTotals(fromDay, toDay) {
    await espera();
    const hoy = format(new Date(), 'yyyy-MM-dd');
    return eachDayOfInterval({ start: parseISO(fromDay), end: parseISO(toDay) }).map((d) => {
      const dia = format(d, 'yyyy-MM-dd');
      // Hoy va a medias: lo que va del día.
      const avance = dia === hoy ? Math.min(1, new Date().getHours() / 20) : 1;
      const pasos = Math.round((4200 + (semilla(dia) % 7800)) * avance);
      return {
        date: dia,
        steps: permisos.steps ? pasos : null,
        distanceM: permisos.distance ? Math.round(pasos * 0.72) : null,
        activeKcal: permisos.active_calories ? Math.round(pasos * 0.041) : null,
        source: 'demo',
      };
    });
  },
  async exerciseSessions(fromIso, toIso) {
    await espera();
    if (!permisos.exercise_sessions) return [];
    return sesiones().filter((s) => s.endAt > fromIso && s.startAt < toIso);
  },
  async disconnect() {
    permisos = { ...NO_PERMISSIONS };
  },
};
