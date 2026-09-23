/**
 * Privacidad e invitaciones de una actividad (RF-C14, RF-S18).
 *
 * Son dos conceptos que se confunden con facilidad: invitar añade personas a la
 * actividad; privada cambia lo que ven quienes NO están invitados. Lo que más importa
 * comprobar es que se excluyan, porque invitar a una actividad privada sería
 * contradecirse.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SharingField } from '@/components/calendar/sharing-field';
import type { Contact } from '@/types/domain';

const contacto = (id: string, nombre: string): Contact =>
  ({
    kind: 'accepted',
    connection: { id: `c-${id}` },
    profile: { id, display_name: nombre, username: id, avatar_url: null, birthday: null, created_at: 'x', role: 'user' },
    myCalendarVisibility: null,
    theirCalendarVisibility: null,
    color: null,
  }) as Contact;

let mockContactos: { data?: Contact[] } = { data: [contacto('ana', 'Ana Ruiz'), contacto('luis', 'Luis Mena')] };
jest.mock('@/hooks/use-connections', () => ({ useContacts: () => mockContactos }));

beforeEach(() => {
  mockContactos = { data: [contacto('ana', 'Ana Ruiz'), contacto('luis', 'Luis Mena')] };
});

const montar = async (props: Partial<React.ComponentProps<typeof SharingField>> = {}) => {
  const onPrivateChange = jest.fn();
  const onShareWithChange = jest.fn();
  const onContactIdsChange = jest.fn();
  await render(
    <SharingField
      isPrivate={false}
      onPrivateChange={onPrivateChange}
      shareWith="none"
      onShareWithChange={onShareWithChange}
      contactIds={[]}
      onContactIdsChange={onContactIdsChange}
      {...props}
    />,
  );
  return { onPrivateChange, onShareWithChange, onContactIdsChange };
};

describe('a quién invitar', () => {
  it('ofrece nadie, algunos y todos', async () => {
    await montar();
    for (const o of ['Nadie', 'Algunos', 'Todos']) expect(screen.getByLabelText(o)).toBeTruthy();
  });

  it('arranca sin invitar a nadie', async () => {
    await montar();
    expect(screen.getByLabelText('Nadie').props.accessibilityState.selected).toBe(true);
  });

  it('con "Algunos" aparecen los contactos para elegir', async () => {
    await montar({ shareWith: 'some' });
    expect(screen.getByLabelText('Ana')).toBeTruthy();
    expect(screen.getByLabelText('Luis')).toBeTruthy();
  });

  it('con "Nadie" no se pide elegir a nadie', async () => {
    await montar();
    expect(screen.queryByLabelText('Ana')).toBeNull();
  });

  it('elegir un contacto lo comunica', async () => {
    const { onContactIdsChange } = await montar({ shareWith: 'some' });

    await fireEvent.press(screen.getByLabelText('Ana'));

    expect(onContactIdsChange).toHaveBeenCalledWith(['ana']);
  });

  it('volver a tocarlo lo quita', async () => {
    const { onContactIdsChange } = await montar({ shareWith: 'some', contactIds: ['ana'] });

    await fireEvent.press(screen.getByLabelText('Ana'));

    expect(onContactIdsChange).toHaveBeenCalledWith([]);
  });

  it('con "Todos" dice a cuántas personas', async () => {
    await montar({ shareWith: 'all' });
    expect(screen.getByText(/se invitará a tus 2 contactos/i)).toBeTruthy();
  });

  it('sin contactos lo explica en vez de dejar el hueco', async () => {
    mockContactos = { data: [] };
    await montar();
    expect(screen.getByText(/aún no tienes contactos/i)).toBeTruthy();
  });

  it('las solicitudes pendientes no cuentan como contactos', async () => {
    mockContactos = { data: [{ ...contacto('maria', 'María'), kind: 'incoming' } as Contact] };
    await montar({ shareWith: 'some' });
    expect(screen.queryByLabelText('María')).toBeNull();
  });
});

describe('privada', () => {
  it('se ofrece el interruptor', async () => {
    await montar();
    expect(screen.getByLabelText('Privada')).toBeTruthy();
  });

  it('explica qué implica antes de activarla', async () => {
    await montar();
    expect(screen.getByText(/verán el hueco como ocupado, nunca el título/i)).toBeTruthy();
  });

  it('activada lo recuerda', async () => {
    await montar({ isPrivate: true });
    expect(screen.getByText(/solo tú ves de qué se trata/i)).toBeTruthy();
  });

  /** Invitar a una actividad privada sería contradecirse. */
  it('activarla retira las invitaciones pendientes de enviar', async () => {
    const { onShareWithChange, onContactIdsChange } = await montar({ shareWith: 'some', contactIds: ['ana'] });

    await fireEvent(screen.getByLabelText('Privada'), 'valueChange', true);

    expect(onShareWithChange).toHaveBeenCalledWith('none');
    expect(onContactIdsChange).toHaveBeenCalledWith([]);
  });

  it('privada esconde la opción de invitar', async () => {
    await montar({ isPrivate: true });
    expect(screen.queryByLabelText('Todos')).toBeNull();
    expect(screen.getByText(/no se puede compartir/i)).toBeTruthy();
  });

  it('desactivarla lo comunica', async () => {
    const { onPrivateChange } = await montar({ isPrivate: true });

    await fireEvent(screen.getByLabelText('Privada'), 'valueChange', false);

    expect(onPrivateChange).toHaveBeenCalledWith(false);
  });
});

describe('errores', () => {
  it('se muestran junto al selector', async () => {
    await montar({ shareWith: 'some', error: 'Elige al menos un contacto, o cambia a «Nadie».' });
    expect(screen.getByText(/elige al menos un contacto/i)).toBeTruthy();
  });
});
