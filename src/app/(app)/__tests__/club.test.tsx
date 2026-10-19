/**
 * Club de lectura (spec 13f, RF-BC1 – RF-BC5; T306): la pantalla del club, crear uno y las invitaciones en
 * Compartido. Se fija que nadie pierda su copia (salir, quitar y cerrar piden confirmación y lo dicen), que solo
 * quien dirige administra, y que una invitación diga cuánto espacio falta antes de aceptar.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { es } from '@/i18n/es';

const C = es.library.clubs;
const mockConfirm = jest.fn(async (_o: unknown) => true);
const mockSnackbar = jest.fn();
const mockMut = {
  create: { mutate: jest.fn(), isPending: false, error: null },
  invite: { mutate: jest.fn(), isPending: false, error: null },
  removeInvite: { mutate: jest.fn(), isPending: false, error: null },
  accept: { mutate: jest.fn(), isPending: false, error: null, variables: undefined },
  leave: { mutate: jest.fn(), isPending: false, error: null },
  removeMember: { mutate: jest.fn(), isPending: false, error: null },
  close: { mutate: jest.fn(), isPending: false, error: null },
  rename: { mutate: jest.fn(), isPending: false, error: null },
  progress: { mutate: jest.fn(), isPending: false, error: null },
};
let mockYo = 'u-yo';
let mockClubs: Record<string, unknown>[] = [];
let mockMiembros: Record<string, unknown>[] = [];
let mockUsado = 0;
let mockLibro: Record<string, unknown> | null = null;

jest.mock('@/hooks/use-clubs', () => ({
  useClubs: () => ({ clubs: mockClubs, members: mockMiembros, isPending: false, isError: false, error: null, refetch: jest.fn() }),
  useClubMutations: () => mockMut,
  useClubBook: () => ({ data: mockLibro, isSuccess: true }),
}));
jest.mock('@/hooks/use-connections', () => ({
  useContacts: () => ({
    data: [
      { kind: 'accepted', profile: { id: 'u-ana', display_name: 'Ana Torres', username: 'ana', avatar_url: null } },
      { kind: 'accepted', profile: { id: 'u-pedro', display_name: 'Pedro Ruiz', username: 'pedro', avatar_url: null } },
      { kind: 'incoming', profile: { id: 'u-luis', display_name: 'Luis Mena', username: 'luis', avatar_url: null } },
    ],
  }),
}));
jest.mock('@/hooks/use-library', () => ({
  useLibraryItems: () => ({ data: [{ id: 'copia', title: 'Rayuela', authors: ['Cortázar'], club_id: 'c1' }] }),
  useLibraryUsage: () => ({ data: { usedBytes: mockUsado, limitBytes: 500 * 1024 * 1024 }, isSuccess: true }),
}));
jest.mock('@/components/library/book-cover', () => ({ BookCover: () => null }));
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: mockYo }), useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar }));

/* eslint-disable @typescript-eslint/no-require-imports -- tras los mocks */
const Club = require('@/app/(app)/club/[id]').default as () => React.ReactElement;
const { ClubInvitations } = require('@/components/library/club-invitations') as typeof import('@/components/library/club-invitations');
const { CreateClubSheet } = require('@/components/library/create-club-sheet') as typeof import('@/components/library/create-club-sheet');
/* eslint-enable @typescript-eslint/no-require-imports */
const conParametros = (globalThis as unknown as { setParametrosDeRuta: (p: Record<string, string>) => void }).setParametrosDeRuta;

const MB = 1024 * 1024;
const club = { id: 'c1', host_id: 'u-yo', name: 'Club de Rayuela', source_item_id: 'copia', kind: 'pdf', file_size: 20 * MB, created_at: 'c', updated_at: 'u' };
const miembro = (person_id: string, display_name: string, status = 'accepted', extra = {}) => ({
  club_id: 'c1', person_id, status, item_id: status === 'accepted' ? `copia-${person_id}` : null, shows_progress: true, invited_by: 'u-yo', created_at: 'c', joined_at: null,
  profile: { display_name, username: display_name.toLowerCase(), avatar_url: null }, ...extra,
});

beforeEach(() => {
  mockYo = 'u-yo';
  mockClubs = [club];
  mockMiembros = [miembro('u-yo', 'Areli', 'accepted', { item_id: 'copia' }), miembro('u-ana', 'Ana Torres'), miembro('u-pedro', 'Pedro Ruiz', 'pending')];
  mockUsado = 0;
  mockLibro = { title: 'Rayuela', authors: [], kind: 'pdf', file_size: 20 * MB, cover_color: null, page_count: 3, host_name: 'Areli' };
  for (const m of Object.values(mockMut)) m.mutate.mockReset();
  mockConfirm.mockClear();
  mockSnackbar.mockClear();
  conParametros({ id: 'c1' });
});

describe('pantalla del club', () => {
  it('quien dirige ve a los miembros con su papel y puede quitar o retirar invitaciones', async () => {
    await render(<Club />);
    expect(screen.getByText(C.you('Areli'))).toBeTruthy();
    expect(screen.getByText(C.pending)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: C.cancelInvite('Pedro Ruiz') }));
    expect(mockMut.removeInvite.mutate).toHaveBeenCalledWith({ clubId: 'c1', personId: 'u-pedro' }, expect.anything());
    await fireEvent.press(screen.getByRole('button', { name: C.remove('Ana Torres') }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: C.removeTitle('Ana Torres'), message: C.removeMessage }));
    await waitFor(() => expect(mockMut.removeMember.mutate).toHaveBeenCalledWith({ clubId: 'c1', personId: 'u-ana' }, expect.anything()));
  });

  it('invitar a más ofrece solo contactos aceptados que no están en el club', async () => {
    mockMiembros = [miembro('u-yo', 'Areli', 'accepted', { item_id: 'copia' })];
    await render(<Club />);
    await fireEvent.press(screen.getByRole('button', { name: C.inviteMore }));
    expect(screen.queryByRole('checkbox', { name: 'Luis Mena' })).toBeNull();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ana Torres' }));
    await fireEvent.press(screen.getByRole('button', { name: C.invite }));
    expect(mockMut.invite.mutate).toHaveBeenCalledWith({ clubId: 'c1', personIds: ['u-ana'] }, expect.anything());
  });

  it('cerrar el club avisa que cada quien se queda con su copia', async () => {
    await render(<Club />);
    await fireEvent.press(screen.getByRole('button', { name: C.close }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: C.closeTitle, message: C.closeMessage }));
    await waitFor(() => expect(mockMut.close.mutate).toHaveBeenCalledWith('c1', expect.anything()));
  });

  it('un miembro no administra: sale (y decide si muestra su avance)', async () => {
    mockYo = 'u-ana';
    await render(<Club />);
    expect(screen.queryByRole('button', { name: C.inviteMore })).toBeNull();
    expect(screen.queryByRole('button', { name: C.close })).toBeNull();
    await fireEvent.press(screen.getByRole('switch', { name: C.showProgress }));
    expect(mockMut.progress.mutate).toHaveBeenCalledWith({ clubId: 'c1', visible: false });
    await fireEvent.press(screen.getByRole('button', { name: C.leave }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: C.leaveTitle, message: C.leaveMessage }));
    await waitFor(() => expect(mockMut.leave.mutate).toHaveBeenCalledWith('c1', expect.anything()));
  });

  it('si ya no estoy en el club lo dice', async () => {
    mockClubs = [];
    await render(<Club />);
    expect(screen.getByText(C.notFound)).toBeTruthy();
  });
});

describe('invitaciones en Compartido', () => {
  beforeEach(() => {
    mockYo = 'u-pedro';
    mockClubs = [{ ...club, host_id: 'u-ana' }];
    mockMiembros = [miembro('u-ana', 'Ana Torres'), miembro('u-pedro', 'Pedro Ruiz', 'pending')];
    mockLibro = { ...(mockLibro as object), host_name: 'Ana Torres' };
  });

  it('dice quién invita, qué libro y cuánto ocupa; aceptar y rechazar', async () => {
    await render(<ClubInvitations />);
    expect(screen.getByText(C.invitedBy('Ana Torres', 'Rayuela'))).toBeTruthy();
    expect(screen.getByText(C.size('20 MB'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: C.accept }));
    expect(mockMut.accept.mutate).toHaveBeenCalledWith('c1', expect.anything());
    await fireEvent.press(screen.getByRole('button', { name: C.decline }));
    expect(mockMut.removeInvite.mutate).toHaveBeenCalledWith({ clubId: 'c1', personId: 'u-pedro' }, expect.anything());
  });

  it('con 490 MB usados dice que faltan 10 MB y no deja aceptar', async () => {
    mockUsado = 490 * MB;
    await render(<ClubInvitations />);
    expect(screen.getByText(C.missing('10 MB'))).toBeTruthy();
    expect(screen.getByRole('button', { name: C.accept })).toBeDisabled();
  });
});

describe('crear el club', () => {
  it('el nombre es el título, avisa de los derechos e invita a los contactos elegidos', async () => {
    const onCrear = jest.fn();
    await render(<CreateClubSheet libro={{ id: 'l1', title: 'Rayuela' } as never} onClose={jest.fn()} onCrear={onCrear} creando={false} error={null} />);
    expect(screen.getByDisplayValue('Rayuela')).toBeTruthy();
    expect(screen.getByText(C.rights)).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Pedro Ruiz' }));
    await fireEvent.press(screen.getByRole('button', { name: C.create }));
    expect(onCrear).toHaveBeenCalledWith({ name: 'Rayuela', invitar: ['u-pedro'] });
  });
});
