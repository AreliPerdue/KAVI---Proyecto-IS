/**
 * Pestanas de personas para superponer calendarios (RF-S7, RF-S8, RF-S15).
 *
 * Solo tiene sentido ofrecer a quien de verdad comparte su calendario conmigo: un
 * contacto aceptado que no me lo comparte no puede superponerse, y ensenarlo apagado
 * solo invitaria a tocarlo para nada. Ese filtro es lo principal que se prueba aqui.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { PeopleTabs } from '@/components/calendar/people-tabs';
import type { Contact } from '@/types/domain';

const contacto = (over: Partial<Contact> & { id: string; nombre: string }): Contact =>
  ({
    connection: { id: `con-${over.id}`, requester_id: 'u1', addressee_id: over.id, status: 'accepted', created_at: 'x', responded_at: 'x' },
    profile: { id: over.id, display_name: over.nombre, username: over.id, email: `${over.id}@kavi.app`, avatar_url: null, created_at: 'x' },
    kind: 'accepted',
    myCalendarVisibility: null,
    theirCalendarVisibility: 'busy',
    color: null,
    ...over,
  }) as Contact;

const ANA = contacto({ id: 'ana', nombre: 'Ana Ruiz' });
const PEDRO = contacto({ id: 'pedro', nombre: 'Pedro Lima' });

let mockMiColor = '#176BFF';
let mockContacts: { data?: Contact[] } = { data: [ANA, PEDRO] };
jest.mock('@/hooks/use-connections', () => ({
  useContacts: () => mockContacts,
  useSelfColor: () => mockMiColor,
}));

beforeEach(() => {
  mockContacts = { data: [ANA, PEDRO] };
  globalThis.mockRouter.push.mockClear();
});

const montar = async (overlayUserIds: string[] = []) => {
  const onToggle = jest.fn();
  const onOnlyMe = jest.fn();
  await render(
    <PeopleTabs overlayUserIds={overlayUserIds} colorOf={() => '#4CAF50'} onToggle={onToggle} onOnlyMe={onOnlyMe} />,
  );
  return { onToggle, onOnlyMe };
};

describe('quien aparece', () => {
  it('yo siempre estoy, y siempre activo', async () => {
    await montar();
    expect(screen.getByLabelText('Tú').props.accessibilityState.selected).toBe(true);
  });

  it('salen los contactos que me comparten su calendario', async () => {
    await montar();
    expect(screen.getByLabelText('Ana')).toBeTruthy();
    expect(screen.getByLabelText('Pedro')).toBeTruthy();
  });

  /** Sin visibilidad no hay nada que superponer, asi que no se ofrece. */
  it('un contacto que no me comparte su calendario no aparece', async () => {
    mockContacts = { data: [ANA, contacto({ id: 'luis', nombre: 'Luis Paz', theirCalendarVisibility: null })] };
    await montar();
    expect(screen.queryByLabelText('Luis')).toBeNull();
  });

  it('una solicitud pendiente tampoco', async () => {
    mockContacts = { data: [contacto({ id: 'maria', nombre: 'María Sol', kind: 'outgoing' })] };
    await montar();
    expect(screen.queryByLabelText('María')).toBeNull();
  });

  it('sin contactos quedan solo "Tú" y el acceso a contactos', async () => {
    mockContacts = { data: [] };
    await montar();
    expect(screen.getByLabelText('Tú')).toBeTruthy();
    expect(screen.getByLabelText('Agregar contactos')).toBeTruthy();
  });

  it('mientras cargan tampoco revienta', async () => {
    mockContacts = { data: undefined };
    await montar();
    expect(screen.getByLabelText('Tú')).toBeTruthy();
  });
});

describe('como se nombran', () => {
  it('se usa el nombre de pila, para que quepan varias pestanas', async () => {
    await montar();
    expect(screen.getByLabelText('Ana')).toBeTruthy();
    expect(screen.queryByLabelText('Ana Ruiz')).toBeNull();
  });

  it('sin nombre en el perfil se cae a una etiqueta generica', async () => {
    const anonimo = contacto({ id: 'x', nombre: 'X' });
    mockContacts = { data: [{ ...anonimo, profile: { ...anonimo.profile, display_name: null } }] };
    await montar();
    expect(screen.getByLabelText('Contacto')).toBeTruthy();
  });
});

describe('interaccion', () => {
  it('tocar un contacto pide superponerlo', async () => {
    const { onToggle } = await montar();

    await fireEvent.press(screen.getByLabelText('Ana'));

    expect(onToggle).toHaveBeenCalledWith('ana');
  });

  it('los superpuestos se ven marcados', async () => {
    await montar(['ana']);
    expect(screen.getByLabelText('Ana').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Pedro').props.accessibilityState.selected).toBe(false);
  });

  it('se pueden superponer varios a la vez', async () => {
    await montar(['ana', 'pedro']);
    expect(screen.getByLabelText('Ana').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Pedro').props.accessibilityState.selected).toBe(true);
  });

  it('tocar "Tú" vuelve a dejar solo mi calendario', async () => {
    const { onOnlyMe } = await montar(['ana', 'pedro']);

    await fireEvent.press(screen.getByLabelText('Tú'));

    expect(onOnlyMe).toHaveBeenCalledTimes(1);
  });

  it('el acceso a contactos lleva a la pantalla de compartidos', async () => {
    await montar();

    await fireEvent.press(screen.getByLabelText('Agregar contactos'));

    expect(globalThis.mockRouter.push).toHaveBeenCalledWith('/(app)/(tabs)/shared');
  });
});
