/** Los libros guardados en el teléfono (RF-BR3, T285): bajar una vez, leer en pedazos, borrar. */
type Nodo = { uri: string };
const mockDisco = new Map<string, Uint8Array>();
const mockCarpetas = new Set<string>();

jest.mock('expo-file-system', () => {
  const unir = (partes: (string | Nodo)[]) => partes.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
  class Directory {
    uri: string;
    constructor(...partes: (string | Nodo)[]) {
      this.uri = unir(partes);
    }
    get exists() {
      return mockCarpetas.has(this.uri);
    }
    create() {
      mockCarpetas.add(this.uri);
    }
    delete() {
      mockCarpetas.delete(this.uri);
      for (const k of [...mockDisco.keys()]) if (k.startsWith(`${this.uri}/`)) mockDisco.delete(k);
    }
  }
  class File {
    uri: string;
    constructor(...partes: (string | Nodo)[]) {
      this.uri = unir(partes);
    }
    get exists() {
      return mockDisco.has(this.uri);
    }
    get size() {
      return mockDisco.get(this.uri)?.length ?? 0;
    }
    delete() {
      mockDisco.delete(this.uri);
    }
    open() {
      const datos = mockDisco.get(this.uri) as Uint8Array;
      let pos = 0;
      return {
        readBytes: (n: number) => {
          const pedazo = datos.subarray(pos, pos + n);
          pos += pedazo.length;
          return pedazo;
        },
        close: () => undefined,
      };
    }
  }
  return { Directory, File, Paths: { document: { uri: 'file:///docs' } } };
});

import { base64ToBytes } from '@/lib/library/base64';

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const copias = require('@/lib/library/offline/copies') as typeof import('@/lib/library/offline/copies');

beforeEach(() => {
  mockDisco.clear();
  mockCarpetas.clear();
});

const RUTA = 'u1/l1/rayuela.pdf';
const bajar = (bytes: Uint8Array) =>
  jest.fn(async (_ruta: string, destino: string) => {
    mockDisco.set(destino, bytes);
  });

it('la primera vez la baja a su carpeta; después la usa sin volver a bajarla', async () => {
  const descargar = bajar(new Uint8Array([1, 2, 3]));
  const archivo = await copias.asegurarCopia('l1', RUTA, descargar);
  expect(archivo.uri).toBe('file:///docs/library/l1/rayuela.pdf');
  expect(descargar).toHaveBeenCalledWith(RUTA, 'file:///docs/library/l1/rayuela.pdf');
  expect(copias.hayCopia('l1', RUTA)).toBe(true);
  await copias.asegurarCopia('l1', RUTA, descargar);
  expect(descargar).toHaveBeenCalledTimes(1);
});

it('si el libro cambió de archivo, baja el nuevo y suelta el viejo', async () => {
  await copias.asegurarCopia('l1', RUTA, bajar(new Uint8Array([1])));
  await copias.asegurarCopia('l1', 'u1/l1/rayuela-convertido.pdf', bajar(new Uint8Array([2])));
  expect(copias.hayCopia('l1', RUTA)).toBe(false);
  expect(copias.hayCopia('l1', 'u1/l1/rayuela-convertido.pdf')).toBe(true);
});

it('si la descarga falla no queda un archivo a medias', async () => {
  const falla = jest.fn(async (_ruta: string, destino: string) => {
    mockDisco.set(destino, new Uint8Array([9]));
    throw new TypeError('Network request failed');
  });
  await expect(copias.asegurarCopia('l1', RUTA, falla)).rejects.toThrow('Network');
  expect(copias.hayCopia('l1', RUTA)).toBe(false);
});

it('la lee en pedazos de medio mega, en base64', async () => {
  const bytes = new Uint8Array(copias.PEDAZO * 2 + 10).fill(7);
  const archivo = await copias.asegurarCopia('l1', RUTA, bajar(bytes));
  const pedazos: string[] = [];
  expect(await copias.leerEnPedazos(archivo, (b) => pedazos.push(b))).toBe(bytes.length);
  expect(pedazos).toHaveLength(3);
  expect(pedazos.map((p) => base64ToBytes(p).length)).toEqual([copias.PEDAZO, copias.PEDAZO, 10]);
  expect(base64ToBytes(pedazos[2])).toEqual(new Uint8Array(10).fill(7));
});

it('borrar piezas se lleva sus copias; eliminar la cuenta, todas', async () => {
  await copias.asegurarCopia('l1', RUTA, bajar(new Uint8Array([1])));
  await copias.asegurarCopia('l2', 'u1/l2/aura.epub', bajar(new Uint8Array([1])));
  copias.borrarCopias(['l1']);
  expect(copias.hayCopia('l1', RUTA)).toBe(false);
  expect(copias.hayCopia('l2', 'u1/l2/aura.epub')).toBe(true);
  mockCarpetas.add('file:///docs/library');
  copias.borrarTodas();
  expect(copias.hayCopia('l2', 'u1/l2/aura.epub')).toBe(false);
});
