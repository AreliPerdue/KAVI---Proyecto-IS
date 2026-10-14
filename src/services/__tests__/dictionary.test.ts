/**
 * Definir una palabra (spec 13c, RF-BH8; decisión B4 enmendada): inglés con Wiktionary y, si no responde, la
 * Free Dictionary API; español con la RAE.
 */
import { definirEnIngles, enlaceExterno, enlaceRae, idiomaEspanol, pareceEspanol, sinHtml } from '@/services/dictionary';

const respuesta = (status: number, cuerpo?: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo }) as Response;

const wiktionaryBook = {
  en: [
    {
      partOfSpeech: 'Noun',
      definitions: [
        { definition: '' },
        { definition: 'A collection of sheets of paper bound together.', examples: ['She opened the <b>book</b> to page 37.'] },
        { definition: 'A long work fit for <a href="/wiki/publication">publication</a>, such as a novel &amp; more.' },
      ],
    },
    { partOfSpeech: 'Verb', definitions: [{ definition: '<span class="usage-label-sense"></span> To <a href="/wiki/reserve">reserve</a> (something).' }] },
  ],
  fr: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'livre' }] }],
};

afterEach(() => jest.restoreAllMocks());

it('Wiktionary: las acepciones en inglés, sin HTML ni definiciones vacías', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(200, wiktionaryBook));
  const { definicion, espanol } = await definirEnIngles('Book');
  expect(fetchSpy).toHaveBeenCalledWith('https://en.wiktionary.org/api/rest_v1/page/definition/book', { signal: expect.any(AbortSignal) });
  expect(espanol).toBe(false);
  expect(definicion?.fuente).toBe('wiktionary');
  expect(definicion?.acepciones).toEqual([
    { categoria: 'noun', definicion: 'A collection of sheets of paper bound together.', ejemplo: 'She opened the book to page 37.' },
    { categoria: 'noun', definicion: 'A long work fit for publication, such as a novel & more.' },
    { categoria: 'verb', definicion: 'To reserve (something).' },
  ]);
});

it('una palabra que solo está en español lo dice, para ofrecer la RAE', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(200, { es: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'city' }] }] }));
  expect(await definirEnIngles('ciudad')).toEqual({ definicion: null, espanol: true });
});

it('si Wiktionary no la tiene en minúsculas, la busca como se escribió', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(respuesta(404)).mockResolvedValueOnce(respuesta(200, wiktionaryBook));
  const { definicion } = await definirEnIngles('London');
  expect(fetchSpy).toHaveBeenNthCalledWith(2, 'https://en.wiktionary.org/api/rest_v1/page/definition/London', expect.anything());
  expect(definicion?.palabra).toBe('London');
});

it('si Wiktionary no responde, la Free Dictionary API', async () => {
  jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(respuesta(503))
    .mockResolvedValueOnce(respuesta(200, [{ word: 'serendipity', phonetic: '/x/', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'luck', example: 'by serendipity' }] }] }]));
  const { definicion } = await definirEnIngles('serendipity');
  expect(definicion).toEqual({ palabra: 'serendipity', fonetica: '/x/', acepciones: [{ categoria: 'noun', definicion: 'luck', ejemplo: 'by serendipity' }], fuente: 'freedictionary' });
});

it('si ninguno responde, se lanza el error', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(500));
  await expect(definirEnIngles('word')).rejects.toThrow('HTTP 500');
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
    // Wiktionary y luego la Free Dictionary API, cada una con su tope.
    await jest.advanceTimersByTimeAsync(16000);
    await resultado;
  } finally {
    jest.useRealTimers();
  }
});

it('el español: por sus letras o por el idioma del libro', () => {
  expect(pareceEspanol('canción')).toBe(true);
  expect(pareceEspanol('city')).toBe(false);
  expect(idiomaEspanol('es')).toBe(true);
  expect(idiomaEspanol('es-MX')).toBe(true);
  expect(idiomaEspanol('en')).toBe(false);
  expect(idiomaEspanol('est')).toBe(false);
  expect(idiomaEspanol(null)).toBe(false);
  expect(enlaceRae('Canción')).toBe('https://dle.rae.es/canci%C3%B3n');
});

it('quita etiquetas y entidades', () => {
  expect(sinHtml('<i>A</i> &amp; B&#39;s &#x41; &nbsp;C')).toBe("A & B's A C");
});

it('fuera estilos incrustados y subacepciones anidadas', () => {
  expect(sinHtml('Used before a noun<style>.mw-parser-output .defdate{font-size:smaller}</style><ol><li>first<ol><li>deep</li></ol></li><li>second</li></ol> phrase.')).toBe('Used before a noun phrase.');
});

it('los símbolos no salen como acepción', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    respuesta(200, { en: [{ partOfSpeech: 'Symbol', definitions: [{ definition: 'ISO 639-3 code' }] }, { partOfSpeech: 'Article', definitions: [{ definition: 'The definite article.' }] }] }),
  );
  const { definicion } = await definirEnIngles('the');
  expect(definicion?.acepciones).toEqual([{ categoria: 'article', definicion: 'The definite article.' }]);
});

it('el enlace de afuera según el idioma de la app: en español la RAE; en inglés, nunca la RAE', () => {
  expect(enlaceExterno('libro', 'es', true)).toEqual({ sitio: 'rae', url: 'https://dle.rae.es/libro' });
  expect(enlaceExterno('book', 'es', false).sitio).toBe('rae');
  expect(enlaceExterno('Book', 'en', false)).toEqual({ sitio: 'merriam', url: 'https://www.merriam-webster.com/dictionary/book' });
  expect(enlaceExterno('ciudad', 'en', true)).toEqual({ sitio: 'wordreference', url: 'https://www.wordreference.com/es/en/translation.asp?spen=ciudad' });
});
