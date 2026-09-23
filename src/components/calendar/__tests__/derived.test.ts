/**
 * Capas derivadas del calendario: entrenamientos y cumpleaños (RF-F10, RF-A10).
 *
 * No son actividades guardadas sino una vista sobre datos que ya existen. Eso es lo
 * que permite ocultarlas con un interruptor sin borrar nada, y que alcancen también a
 * lo registrado antes de que la vista existiera.
 */
import {
  birthdaysToActivities,
  cumpleañerosDe,
  esHoyCumpleaños,
  isDerivedActivity,
  workoutsToActivities,
} from '@/components/calendar/derived';
import type { Contact, Profile, Workout } from '@/types/domain';

const entreno = (over: Partial<Workout> = {}): Workout =>
  ({
    id: 'w1', owner_id: 'u1', activity_id: null, activity_title: null, title: null,
    performed_at: new Date(2026, 8, 21, 7, 30).toISOString(),
    duration_minutes: null, notes: null, created_at: 'x',
    ...over,
  }) as Workout;

const perfil = (over: Partial<Profile> = {}): Profile =>
  ({ id: 'p1', username: 'ana', display_name: 'Ana Ruiz', avatar_url: null, birthday: null, created_at: 'x', role: 'user', ...over }) as Profile;

describe('entrenamientos en el calendario', () => {
  it('un entrenamiento suelto se pinta', () => {
    expect(workoutsToActivities([entreno()])).toHaveLength(1);
  });

  /** El que tiene actividad ya se ve a través de ella: pintarlo lo duplicaría. */
  it('el que tiene actividad no se pinta', () => {
    expect(workoutsToActivities([entreno({ activity_id: 'a1' })])).toHaveLength(0);
  });

  it('usa el nombre del entrenamiento', () => {
    expect(workoutsToActivities([entreno({ title: 'Pierna' })])[0].title).toBe('Pierna');
  });

  it('sin nombre queda un texto de reserva', () => {
    expect(workoutsToActivities([entreno()])[0].title).toBe('Entrenamiento');
  });

  it('empieza a la hora en que se registro', () => {
    expect(workoutsToActivities([entreno()])[0].start_at).toBe(entreno().performed_at);
  });

  it('dura lo que suman sus ejercicios', () => {
    const [a] = workoutsToActivities([entreno({ duration_minutes: 45 })]);
    expect((Date.parse(a.end_at) - Date.parse(a.start_at)) / 60000).toBe(45);
  });

  it('sin duracion registrada se le da una hora', () => {
    const [a] = workoutsToActivities([entreno()]);
    expect((Date.parse(a.end_at) - Date.parse(a.start_at)) / 60000).toBe(60);
  });

  it('se marca como de gimnasio y dimension fisica', () => {
    const [a] = workoutsToActivities([entreno()]);
    expect(a.is_gym).toBe(true);
    expect(a.dimension).toBe('fisica');
  });

  it('se reconoce como derivado, para no ofrecer editarlo', () => {
    expect(isDerivedActivity(workoutsToActivities([entreno()])[0])).toBe(true);
  });

  it('una actividad normal no se confunde con una derivada', () => {
    expect(isDerivedActivity({ id: 'act-123' })).toBe(false);
  });
});

describe('cumpleaños', () => {
  const desde = new Date(2026, 8, 1);
  const hasta = new Date(2026, 9, 1);

  it('uno dentro del rango aparece', () => {
    const r = birthdaysToActivities([perfil({ birthday: '1998-09-15' })], desde, hasta);
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe('Cumpleaños de Ana');
  });

  it('uno fuera del rango no', () => {
    expect(birthdaysToActivities([perfil({ birthday: '1998-12-15' })], desde, hasta)).toHaveLength(0);
  });

  /** La fecha guardada lleva año, pero el cumpleaños se repite cada año. */
  it('el año guardado no importa: cuenta el dia y el mes', () => {
    const r = birthdaysToActivities([perfil({ birthday: '1970-09-15' })], desde, hasta);
    expect(r[0].start_at.slice(0, 4)).toBe('2026');
  });

  it('quien no lo tiene definido no genera nada', () => {
    expect(birthdaysToActivities([perfil({ birthday: null })], desde, hasta)).toHaveLength(0);
  });

  it('es de todo el dia', () => {
    expect(birthdaysToActivities([perfil({ birthday: '1998-09-15' })], desde, hasta)[0].all_day).toBe(true);
  });

  it('lleva el icono de pastel', () => {
    expect(birthdaysToActivities([perfil({ birthday: '1998-09-15' })], desde, hasta)[0].icon).toBe('cake');
  });

  it('usa el nombre de pila', () => {
    const r = birthdaysToActivities([perfil({ birthday: '1998-09-15', display_name: 'María Fernanda Sol' })], desde, hasta);
    expect(r[0].title).toBe('Cumpleaños de María');
  });

  it('sin nombre visible cae al usuario', () => {
    const r = birthdaysToActivities([perfil({ birthday: '1998-09-15', display_name: null })], desde, hasta);
    expect(r[0].title).toBe('Cumpleaños de ana');
  });

  /** Un rango de diciembre a enero cruza el cambio de año. */
  it('un rango a caballo entre dos años encuentra el cumpleaños', () => {
    const r = birthdaysToActivities(
      [perfil({ birthday: '1998-01-03' })],
      new Date(2026, 11, 28),
      new Date(2027, 0, 5),
    );
    expect(r).toHaveLength(1);
    expect(r[0].start_at.slice(0, 4)).toBe('2027');
  });

  /** 29 de febrero: en un año no bisiesto la fecha no existe y se omite. */
  it('el 29 de febrero se omite en año no bisiesto', () => {
    const r = birthdaysToActivities([perfil({ birthday: '2000-02-29' })], new Date(2026, 1, 1), new Date(2026, 2, 1));
    expect(r).toHaveLength(0);
  });

  it('pero aparece en año bisiesto', () => {
    const r = birthdaysToActivities([perfil({ birthday: '2000-02-29' })], new Date(2028, 1, 1), new Date(2028, 2, 1));
    expect(r).toHaveLength(1);
  });

  it('no se puede editar desde el calendario', () => {
    const r = birthdaysToActivities([perfil({ birthday: '1998-09-15' })], desde, hasta);
    expect(isDerivedActivity(r[0])).toBe(true);
  });
});

describe('de quien se muestran', () => {
  const contacto = (kind: string, id: string): Contact =>
    ({ kind, profile: perfil({ id }), connection: { id: `c-${id}` }, myCalendarVisibility: null, theirCalendarVisibility: null, color: null }) as Contact;

  it('el mio y el de mis contactos aceptados', () => {
    const r = cumpleañerosDe(perfil({ id: 'yo' }), [contacto('accepted', 'ana')]);
    expect(r.map((p) => p.id)).toEqual(['yo', 'ana']);
  });

  it('una solicitud pendiente no cuenta', () => {
    const r = cumpleañerosDe(perfil({ id: 'yo' }), [contacto('incoming', 'luis')]);
    expect(r.map((p) => p.id)).toEqual(['yo']);
  });

  it('sin mi perfil cargado solo salen los contactos', () => {
    expect(cumpleañerosDe(undefined, [contacto('accepted', 'ana')]).map((p) => p.id)).toEqual(['ana']);
  });
});

describe('es hoy mi cumpleaños', () => {
  it('coincide dia y mes', () => {
    expect(esHoyCumpleaños('1998-09-23', new Date(2026, 8, 23))).toBe(true);
  });

  it('otro dia no', () => {
    expect(esHoyCumpleaños('1998-09-23', new Date(2026, 8, 24))).toBe(false);
  });

  it('sin cumpleaños definido no', () => {
    expect(esHoyCumpleaños(null)).toBe(false);
  });
});
