/** Portada propia (RF-BL23, T314): preparar la imagen y de dónde sale en el teléfono. */
import { es } from '@/i18n/es';

const mockRender = jest.fn();
const mockResize = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: (uri: string) => ({
      renderAsync: () => mockRender(uri, null),
      resize: (opciones: unknown) => {
        mockResize(opciones);
        return { renderAsync: () => mockRender(uri, opciones) };
      },
    }),
  },
}));
jest.mock('@/lib/library/import/cover-color', () => ({ colorDeImagen: async () => '#EC4899' }));

const mockGaleria = jest.fn();
const mockCamara = jest.fn();
const mockPermiso = jest.fn();
const mockDocumento = jest.fn();
const mockHayImagen = jest.fn();
const mockImagen = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...a: unknown[]) => mockGaleria(...a),
  launchCameraAsync: (...a: unknown[]) => mockCamara(...a),
  requestCameraPermissionsAsync: () => mockPermiso(),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: (...a: unknown[]) => mockDocumento(...a) }));
jest.mock('expo-clipboard', () => ({ hasImageAsync: () => mockHayImagen(), getImageAsync: (...a: unknown[]) => mockImagen(...a) }));

/* eslint-disable @typescript-eslint/no-require-imports -- tras los mocks */
const { ANCHO_PORTADA, prepararPortada } = require('@/lib/library/cover/prepare') as typeof import('@/lib/library/cover/prepare');
const fuentes = require('@/lib/library/cover/sources') as typeof import('@/lib/library/cover/sources');
/* eslint-enable @typescript-eslint/no-require-imports */

/** Una imagen ya dibujada de ese ancho que se guarda como "AQID" (bytes 1, 2, 3). */
const imagen = (width: number) => ({ width, height: width * 1.5, saveAsync: jest.fn(async () => ({ base64: 'AQID' })) });

beforeEach(() => {
  for (const m of [mockRender, mockResize, mockGaleria, mockCamara, mockPermiso, mockDocumento, mockHayImagen, mockImagen]) m.mockReset();
});

describe('prepararPortada', () => {
  it('una imagen ancha se reduce a 1200 px y se guarda en JPEG con su color', async () => {
    const reducida = imagen(ANCHO_PORTADA);
    mockRender.mockImplementation(async (_uri: string, opciones: unknown) => (opciones ? reducida : imagen(3000)));
    const lista = await prepararPortada('file:///foto.heic');
    expect(mockResize).toHaveBeenCalledWith({ width: ANCHO_PORTADA });
    expect(reducida.saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.85, base64: true });
    expect(lista).toEqual({ jpeg: new Uint8Array([1, 2, 3]), color: '#EC4899', vistaPrevia: 'data:image/jpeg;base64,AQID' });
  });

  it('una imagen chica no se agranda', async () => {
    mockRender.mockResolvedValue(imagen(600));
    await prepararPortada('file:///chica.png');
    expect(mockResize).not.toHaveBeenCalled();
  });

  it('una imagen que no se puede leer da un mensaje claro', async () => {
    mockRender.mockRejectedValue(new Error('decode'));
    await expect(prepararPortada('file:///rota.xyz')).rejects.toThrow(es.library.cover.unreadable);
  });
});

describe('de dónde sale (teléfono)', () => {
  it('galería: la imagen elegida, o nada si cancela', async () => {
    mockGaleria.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///g.jpg' }] }).mockResolvedValueOnce({ canceled: true, assets: [] });
    expect(await fuentes.desdeGaleria()).toBe('file:///g.jpg');
    expect(await fuentes.desdeGaleria()).toBeNull();
    expect(mockGaleria).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 1 });
  });

  it('cámara: pide permiso y, si no lo dan, dice dónde activarlo', async () => {
    mockPermiso.mockResolvedValueOnce({ granted: false });
    await expect(fuentes.desdeCamara()).rejects.toThrow(es.library.cover.cameraDenied);
    expect(mockCamara).not.toHaveBeenCalled();
    mockPermiso.mockResolvedValueOnce({ granted: true });
    mockCamara.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///c.jpg' }] });
    expect(await fuentes.desdeCamara()).toBe('file:///c.jpg');
  });

  it('archivo: solo imágenes', async () => {
    mockDocumento.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///a.png' }] });
    expect(await fuentes.desdeArchivo()).toBe('file:///a.png');
    expect(mockDocumento).toHaveBeenCalledWith({ type: 'image/*', copyToCacheDirectory: true });
  });

  it('portapapeles: la imagen copiada, o nada si no hay', async () => {
    mockHayImagen.mockResolvedValueOnce(false);
    expect(await fuentes.desdePortapapeles()).toBeNull();
    mockHayImagen.mockResolvedValueOnce(true);
    mockImagen.mockResolvedValueOnce({ data: 'data:image/jpeg;base64,AQID' });
    expect(await fuentes.desdePortapapeles()).toBe('data:image/jpeg;base64,AQID');
  });
});
