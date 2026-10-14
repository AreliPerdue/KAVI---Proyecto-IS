/** Definir una palabra (spec 13c, RF-BH8; decisión B4): inglés con Free Dictionary API, español con la RAE. */
import { definirEnIngles, enlaceRae, pareceEspanol } from '@/services/dictionary';

const respuesta = (status: number, cuerpo?: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo }) as Response;

afterEach(() => jest.restoreAllMocks());

it('trae las acepciones con su categoría y ejemplo, hasta seis', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    respuesta(200, [
      {
        word: 'serendipity',
        phonetic: '/ˌsɛɹ.ənˈdɪp.ɪ.ti/',
        meanings: [{ partOfSpeech: 'noun', definitions: Array.from({ length: 8 }, (_, i) => ({ definition: `def ${i}`, ...(i === 0 ? { example: 'by serendipity' } : {}) })) }],
      },
    ]),
  );
  const d = await definirEnIngles('Serendipity');
  expect(fetchSpy).toHaveBeenCalledWith('https://api.dictionaryapi.dev/api/v2/entries/en/serendipity', { signal: expect.any(AbortSignal) });
  expect(d?.fonetica).toBe('/ˌsɛɹ.ənˈdɪp.ɪ.ti/');
  expect(d?.acepciones).toHaveLength(6);
  expect(d?.acepciones[0]).toEqual({ categoria: 'noun', definicion: 'def 0', ejemplo: 'by serendipity' });
});

it('si el diccionario no la tiene, null', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(404, { title: 'No Definitions Found' }));
  expect(await definirEnIngles('ciudad')).toBeNull();
});

it('otro error del servidor se lanza', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(500));
  await expect(definirEnIngles('word')).rejects.toThrow('HTTP 500');
});

it('las palabras con letras del español van a la RAE', () => {
  expect(pareceEspanol('canción')).toBe(true);
  expect(pareceEspanol('niño')).toBe(true);
  expect(pareceEspanol('city')).toBe(false);
  expect(enlaceRae('Canción')).toBe('https://dle.rae.es/canci%C3%B3n');
});

it('si el diccionario tarda más de 8 s, se corta', async () => {
  jest.useFakeTimers();
  try {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_ok, falla) => {
          init?.signal?.addEventListener('abort', () => falla(Object.assign(new Error('abortado'), { name: 'AbortError' })));
        }),
    );
    const pendiente = definirEnIngles('slow');
    const resultado = expect(pendiente).rejects.toThrow('abortado');
    await jest.advanceTimersByTimeAsync(8000);
    await resultado;
  } finally {
    jest.useRealTimers();
  }
});
