/**
 * Portadas de los PDF (RF-BL12, T279): un motor invisible dibuja la primera página de cada PDF sin
 * portada, una por una, y se guarda con su color. Lo que falla no se reintenta en la sesión.
 */
import { act, render } from '@testing-library/react-native';

import type { MensajeAlMotor, MensajeDelMotor } from '@/lib/library/reader-protocol';

const mockEnviados: MensajeAlMotor[] = [];
let mockResponder: (m: MensajeDelMotor) => void = () => undefined;
const mockGuardar = jest.fn();
const mockMontados: string[] = [];

jest.mock('@/components/library/reader-engine', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- dentro de la fábrica del mock */
  const React = require('react') as typeof import('react');
  const Motor = React.forwardRef(function Motor({ onMessage }: { onMessage: (m: MensajeDelMotor) => void }, ref) {
    mockResponder = onMessage;
    React.useImperativeHandle(ref, () => ({ send: (m: MensajeAlMotor) => mockEnviados.push(m) }));
    React.useEffect(() => {
      mockMontados.push('motor');
    }, []);
    return null;
  });
  Motor.displayName = 'MotorDeLectura';
  return { ReaderEngine: Motor };
});
jest.mock('@/hooks/use-library', () => ({
  useLibraryFileUrl: (ruta: string | null) => ({ data: ruta ? `https://r2/${ruta}` : undefined }),
  useSaveCover: () => ({ mutate: mockGuardar }),
}));
jest.mock('@/lib/library/import/cover-color', () => ({ colorDeImagen: async () => '#1E2761' }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const { PdfCoverWorker } = require('@/components/library/pdf-cover-worker') as typeof import('@/components/library/pdf-cover-worker');
// Los PDF ya intentados viven en el módulo para toda la sesión: cada prueba usa ids propios.

const libro = (id: string, extra: Record<string, unknown> = {}) => ({ id, kind: 'pdf', cover_path: null, file_path: `u1/${id}/libro.pdf`, ...extra }) as never;
const responder = async (m: MensajeDelMotor) => {
  await act(async () => {
    mockResponder(m);
    await Promise.resolve();
  });
};

beforeEach(() => {
  mockEnviados.length = 0;
  mockMontados.length = 0;
  mockGuardar.mockReset();
});

it('dibuja la portada del primer PDF sin portada y la guarda con su color', async () => {
  await render(<PdfCoverWorker items={[libro('l0', { cover_path: 'ya/tiene.jpg' }), libro('l1'), libro('l2')]} />);
  await responder({ type: 'ready' });
  expect(mockEnviados).toEqual([{ type: 'cover', url: 'https://r2/u1/l1/libro.pdf', width: 600 }]);
  await responder({ type: 'cover', dataUrl: 'data:image/jpeg;base64,AQID' });
  expect(mockGuardar).toHaveBeenCalledWith({ id: 'l1', jpeg: new Uint8Array([1, 2, 3]), color: '#1E2761' });
});

it('si un PDF falla, sigue con el siguiente y no lo repite', async () => {
  const items = [libro('f1'), libro('f2')];
  const { rerender } = await render(<PdfCoverWorker items={items} />);
  await responder({ type: 'ready' });
  await responder({ type: 'error', code: 'damaged' });
  await rerender(<PdfCoverWorker items={items} />);
  await responder({ type: 'ready' });
  expect(mockEnviados.at(-1)).toEqual({ type: 'cover', url: 'https://r2/u1/f2/libro.pdf', width: 600 });
  expect(mockGuardar).not.toHaveBeenCalled();
});

it('sin PDF pendientes (EPUB, con portada o sin archivo) no monta nada', async () => {
  await render(<PdfCoverWorker items={[libro('e1', { kind: 'epub' }), libro('p1', { cover_path: 'x.jpg' }), libro('p2', { file_path: null })]} />);
  expect(mockMontados).toEqual([]);
});
