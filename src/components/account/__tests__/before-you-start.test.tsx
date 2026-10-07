/**
 * "Antes de empezar" (spec 03, RF-A13): menor de 16 confirma su fecha y elimina la cuenta; de
 * 16 a 17, los estados de la aprobación del adulto con "Volver a enviar" y "Cambiar el correo".
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { BeforeYouStart } from '@/components/account/before-you-start';
import { es } from '@/i18n/es';
import type { GuardianRequest } from '@/lib/consent';

const A = es.account;
const mockEliminar = { mutate: jest.fn(), isPending: false, error: null as Error | null };
const mockAceptar = { mutate: jest.fn(), isPending: false, error: null };
const mockEnviar = { mutate: jest.fn(), isPending: false, isSuccess: false, error: null, data: undefined };

jest.mock('@/hooks/use-consent', () => ({
  useAcceptPrivacy: () => mockAceptar,
  useDeleteUnderageAccount: () => mockEliminar,
  useRequestGuardianApproval: () => mockEnviar,
  useConsentGate: () => ({ isFetching: false, refetch: jest.fn() }),
}));
jest.mock('@/hooks/use-auth-actions', () => ({
  useSignOut: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAccount: () => ({ mutate: jest.fn(), isPending: false, error: null }),
}));
jest.mock('@/providers', () => ({ useAuth: () => ({ user: { email: 'menor@kavi.app' } }), useSnackbar: () => jest.fn() }));

beforeEach(() => {
  for (const m of [mockEliminar, mockAceptar, mockEnviar]) m.mutate.mockReset();
  mockEliminar.error = null;
});

describe('menor de 16', () => {
  it('al escribir una fecha de menos de 16 pide confirmarla; "Es correcta" elimina la cuenta', async () => {
    await render(<BeforeYouStart gate={{ kind: 'aceptar' }} />);
    const hace15 = new Date().getFullYear() - 15;
    await fireEvent.changeText(screen.getByLabelText(es.common.day), '1');
    await fireEvent.changeText(screen.getByLabelText(es.common.month), '1');
    await fireEvent.changeText(screen.getByLabelText(es.common.year), String(hace15));
    await fireEvent.press(screen.getByRole('switch', { name: A.acceptPrivacy }));
    await fireEvent.press(screen.getByRole('switch', { name: A.acceptWellbeing }));
    await fireEvent.press(screen.getByRole('button', { name: A.continue }));

    expect(mockAceptar.mutate).not.toHaveBeenCalled();
    expect(screen.getByText(A.under16Title)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.itsCorrectDelete }));
    expect(mockEliminar.mutate).toHaveBeenCalled();
  });

  it('"Corregir la fecha" regresa al formulario sin borrar nada', async () => {
    await render(<BeforeYouStart gate={{ kind: 'aceptar' }} />);
    await fireEvent.changeText(screen.getByLabelText(es.common.day), '1');
    await fireEvent.changeText(screen.getByLabelText(es.common.month), '1');
    await fireEvent.changeText(screen.getByLabelText(es.common.year), String(new Date().getFullYear() - 10));
    await fireEvent.press(screen.getByRole('switch', { name: A.acceptPrivacy }));
    await fireEvent.press(screen.getByRole('switch', { name: A.acceptWellbeing }));
    await fireEvent.press(screen.getByRole('button', { name: A.continue }));
    await fireEvent.press(screen.getByRole('button', { name: A.fixDate }));
    expect(mockEliminar.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: A.continue })).toBeTruthy();
  });

  it('con la fecha ya guardada como menor, ofrece eliminar la cuenta', async () => {
    await render(<BeforeYouStart gate={{ kind: 'menor-de-16' }} />);
    await fireEvent.press(screen.getByRole('button', { name: A.deleteMyAccount }));
    expect(mockEliminar.mutate).toHaveBeenCalled();
  });
});

describe('aprobación del adulto (16 o 17)', () => {
  const solicitud = (status: GuardianRequest['status']): GuardianRequest =>
    ({ email: 'mama@correo.com', status, expiresAt: '2026-10-14T10:00:00Z' }) as GuardianRequest;

  it.each([
    ['rejected', A.waiting.rejected.title, A.waiting.rejected.intro('mama@correo.com'), A.sendToAnother],
    ['expired', A.waiting.expired.title, A.waiting.expired.intro('mama@correo.com'), A.changeEmail],
  ] as const)('%s muestra su texto y "Volver a enviar" reenvía al mismo correo', async (status, titulo, intro, otro) => {
    await render(<BeforeYouStart gate={{ kind: 'adulto-responsable', request: solicitud(status) }} />);
    expect(screen.getByText(titulo)).toBeTruthy();
    expect(screen.getByText(intro)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.resend }));
    expect(mockEnviar.mutate).toHaveBeenCalledWith('mama@correo.com');
    expect(screen.getByRole('button', { name: otro })).toBeTruthy();
  });

  it('"Cambiar el correo" vuelve a pedirlo vacío y deja cancelar', async () => {
    await render(<BeforeYouStart gate={{ kind: 'adulto-responsable', request: solicitud('expired') }} />);
    await fireEvent.press(screen.getByRole('button', { name: A.changeEmail }));
    const campo = screen.getByLabelText(A.guardianEmail);
    expect(campo.props.value).toBe('');
    const enviar = screen.getByRole('button', { name: A.sendEmail });
    expect(enviar.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(campo, 'papa@correo.com');
    await fireEvent.press(screen.getByRole('button', { name: A.sendEmail }));
    expect(mockEnviar.mutate).toHaveBeenCalledWith('papa@correo.com', expect.anything());
    await fireEvent.press(screen.getByRole('button', { name: A.cancel }));
    expect(screen.getByText(A.waiting.expired.title)).toBeTruthy();
  });
});
