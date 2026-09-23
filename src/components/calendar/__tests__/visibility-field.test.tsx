/**
 * Quién ve el título de una actividad (RF-C14).
 *
 * La regla que gobierna las tres opciones es que **solo restringen, nunca amplían**:
 * el nivel que le diste a cada persona sobre tu calendario es el techo. Elegir a
 * alguien a quien compartes en modo «solo ocupación» no le enseña el título, y la
 * interfaz tiene que decirlo en vez de dejar creer que sí.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { VisibilityField } from '@/components/calendar/visibility-field';
import type { Contact } from '@/types/domain';

const contacto = (id: string, nombre: string, nivel: 'details' | 'busy' | null): Contact =>
  ({
    kind: 'accepted',
    connection: { id: `c-${id}` },
    profile: { id, display_name: nombre, username: id, avatar_url: null, birthday: null, created_at: 'x', role: 'user' },
    myCalendarVisibility: nivel,
    theirCalendarVisibility: null,
    color: null,
  }) as Contact;

let mockContactos: { data?: Contact[] } = {
  data: [contacto('ana', 'Ana Ruiz', 'details'), contacto('luis', 'Luis Mena', 'busy')],
};
jest.mock('@/hooks/use-connections', () => ({ useContacts: () => mockContactos }));

beforeEach(() => {
  mockContactos = { data: [contacto('ana', 'Ana Ruiz', 'details'), contacto('luis', 'Luis Mena', 'busy')] };
});

const montar = async (props: Partial<React.ComponentProps<typeof VisibilityField>> = {}) => {
  const onVisibilityChange = jest.fn();
  const onViewerIdsChange = jest.fn();
  await render(
    <VisibilityField
      visibility="default"
      onVisibilityChange={onVisibilityChange}
      viewerIds={[]}
      onViewerIdsChange={onViewerIdsChange}
      {...props}
    />,
  );
  return { onVisibilityChange, onViewerIdsChange };
};

describe('las tres opciones', () => {
  it('se ofrecen normal, algunos y privada', async () => {
    await montar();
    for (const o of ['Normal', 'Algunos', 'Privada']) expect(screen.getByLabelText(o)).toBeTruthy();
  });

  it('arranca en normal', async () => {
    await montar();
    expect(screen.getByLabelText('Normal').props.accessibilityState.selected).toBe(true);
  });

  it('cambiar de opción lo comunica', async () => {
    const { onVisibilityChange } = await montar();
    await fireEvent.press(screen.getByLabelText('Privada'));
    expect(onVisibilityChange).toHaveBeenCalledWith('private');
  });
});

describe('qué explica cada opción', () => {
  it('normal nombra a quién alcanza y a quién no', async () => {
    await montar();
    expect(screen.getByText(/1 contactos con calendario «con detalles»/i)).toBeTruthy();
    expect(screen.getByText(/al resto les saldrá como ocupado/i)).toBeTruthy();
  });

  it('sin nadie con detalles lo dice en vez de mentir', async () => {
    mockContactos = { data: [contacto('luis', 'Luis', 'busy')] };
    await montar();
    expect(screen.getByText(/ahora mismo, nadie/i)).toBeTruthy();
  });

  it('privada dice que no lo ve nadie', async () => {
    await montar({ visibility: 'private' });
    expect(screen.getByText(/nadie ve de qué se trata/i)).toBeTruthy();
  });

  it('algunos explica qué pasa con los demás', async () => {
    await montar({ visibility: 'selected' });
    expect(screen.getByText(/los demás, el hueco como ocupado/i)).toBeTruthy();
  });
});

describe('elegir personas', () => {
  it('la lista solo aparece en «algunos»', async () => {
    await montar();
    expect(screen.queryByLabelText('Ana')).toBeNull();
  });

  it('en «algunos» se listan los contactos aceptados', async () => {
    await montar({ visibility: 'selected' });
    expect(screen.getByLabelText('Ana')).toBeTruthy();
    expect(screen.getByLabelText('Luis')).toBeTruthy();
  });

  it('marcar a alguien lo comunica', async () => {
    const { onViewerIdsChange } = await montar({ visibility: 'selected' });
    await fireEvent.press(screen.getByLabelText('Ana'));
    expect(onViewerIdsChange).toHaveBeenCalledWith(['ana']);
  });

  it('desmarcar lo quita', async () => {
    const { onViewerIdsChange } = await montar({ visibility: 'selected', viewerIds: ['ana'] });
    await fireEvent.press(screen.getByLabelText('Ana'));
    expect(onViewerIdsChange).toHaveBeenCalledWith([]);
  });

  it('se anuncia como casilla marcada o no', async () => {
    await montar({ visibility: 'selected', viewerIds: ['ana'] });
    expect(screen.getByLabelText('Ana').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Luis').props.accessibilityState.checked).toBe(false);
  });

  /**
   * Lo más importante de esta pantalla: elegir a alguien a quien compartes en modo
   * «solo ocupación» NO le enseña el título. La interfaz lo avisa en vez de dejar
   * creer que sí.
   */
  it('avisa cuando marcar a alguien no va a servir de nada', async () => {
    await montar({ visibility: 'selected', viewerIds: ['luis'] });
    expect(screen.getByText(/verá solo «ocupado»/i)).toBeTruthy();
  });

  it('a quien sí tiene detalles no le pone ese aviso', async () => {
    await montar({ visibility: 'selected', viewerIds: ['ana'] });
    expect(screen.queryByText(/verá solo «ocupado»/i)).toBeNull();
  });

  it('sin contactos lo explica', async () => {
    mockContactos = { data: [] };
    await montar({ visibility: 'selected' });
    expect(screen.getByText(/aún no tienes contactos/i)).toBeTruthy();
  });

  it('las solicitudes pendientes no salen', async () => {
    mockContactos = { data: [{ ...contacto('maria', 'María', 'details'), kind: 'incoming' } as Contact] };
    await montar({ visibility: 'selected' });
    expect(screen.queryByLabelText('María')).toBeNull();
  });
});

describe('distinción con invitar', () => {
  it('recuerda que invitar es otra cosa y dónde está', async () => {
    await montar();
    expect(screen.getByText(/invítalo desde el detalle/i)).toBeTruthy();
  });

  it('en una privada no se ofrece invitar', async () => {
    await montar({ visibility: 'private' });
    expect(screen.queryByText(/invítalo desde el detalle/i)).toBeNull();
  });
});

describe('errores', () => {
  it('se muestran bajo el selector', async () => {
    await montar({ visibility: 'selected', error: 'Elige al menos una persona, o cambia a otra opción.' });
    expect(screen.getByText(/elige al menos una persona/i)).toBeTruthy();
  });
});
