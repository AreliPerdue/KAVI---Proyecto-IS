import type { ImageSourcePropType } from 'react-native';

/**
 * Los stickers incluidos de KAVI Library (spec 13c, RF-BH13; T290). Las imágenes viven una sola vez en
 * `public/reader/stickers/<paquete>/<nombre>.png` (400 px, 256 colores): el motor las toma de ahí en la web,
 * van dentro del motor empaquetado en el teléfono (sin red también se ven) y la hoja para elegirlos las pide
 * con `require`. Un sticker pegado guarda `content.sticker = '<paquete>/<nombre>'`.
 *
 * Para agregar uno: la imagen en su carpeta, su fila aquí y su nombre en `library.stickers.names` (es y en).
 */

/** Las caras de los Nobi: el mismo nombre en cada color de paquete. */
export type NombreDeSticker =
  | 'annoyed'
  | 'cheerie'
  | 'crying'
  | 'curious'
  | 'excited'
  | 'focused-note'
  | 'good-note'
  | 'hiding'
  | 'holding-heart'
  | 'hopeful'
  | 'huh'
  | 'idea'
  | 'love-tear-eyed'
  | 'mischief'
  | 'party'
  | 'pissed'
  | 'popcorn'
  | 'puddle-tears-tantrum'
  | 'puddle-tears'
  | 'silly-upside-down'
  | 'sleeping'
  | 'smutty'
  | 'speechless'
  | 'waving'
  | 'wink'
  | 'worried';

export type PaqueteDeStickers = 'nobi-pink';

export type Sticker = {
  /** `<paquete>/<nombre>`: lo que se guarda en la anotación. */
  id: string;
  paquete: PaqueteDeStickers;
  nombre: NombreDeSticker;
  /** Alto entre ancho de la imagen: así se pega sin deformarse. */
  ar: number;
  imagen: ImageSourcePropType;
};

const nobiRosa = (nombre: NombreDeSticker, ar: number, imagen: ImageSourcePropType): Sticker => ({ id: `nobi-pink/${nombre}`, paquete: 'nobi-pink', nombre, ar, imagen });

/* eslint-disable @typescript-eslint/no-require-imports -- las imágenes se empaquetan con `require` */
export const STICKERS: readonly Sticker[] = [
  nobiRosa('cheerie', 0.812, require('../../public/reader/stickers/nobi-pink/cheerie.png')),
  nobiRosa('waving', 0.77, require('../../public/reader/stickers/nobi-pink/waving.png')),
  nobiRosa('wink', 0.772, require('../../public/reader/stickers/nobi-pink/wink.png')),
  nobiRosa('excited', 0.81, require('../../public/reader/stickers/nobi-pink/excited.png')),
  nobiRosa('party', 0.81, require('../../public/reader/stickers/nobi-pink/party.png')),
  nobiRosa('hopeful', 0.77, require('../../public/reader/stickers/nobi-pink/hopeful.png')),
  nobiRosa('holding-heart', 0.77, require('../../public/reader/stickers/nobi-pink/holding-heart.png')),
  nobiRosa('love-tear-eyed', 0.833, require('../../public/reader/stickers/nobi-pink/love-tear-eyed.png')),
  nobiRosa('idea', 0.81, require('../../public/reader/stickers/nobi-pink/idea.png')),
  nobiRosa('good-note', 0.81, require('../../public/reader/stickers/nobi-pink/good-note.png')),
  nobiRosa('focused-note', 0.81, require('../../public/reader/stickers/nobi-pink/focused-note.png')),
  nobiRosa('curious', 0.772, require('../../public/reader/stickers/nobi-pink/curious.png')),
  nobiRosa('huh', 0.772, require('../../public/reader/stickers/nobi-pink/huh.png')),
  nobiRosa('popcorn', 0.833, require('../../public/reader/stickers/nobi-pink/popcorn.png')),
  nobiRosa('smutty', 0.665, require('../../public/reader/stickers/nobi-pink/smutty.png')),
  nobiRosa('mischief', 0.81, require('../../public/reader/stickers/nobi-pink/mischief.png')),
  nobiRosa('silly-upside-down', 0.767, require('../../public/reader/stickers/nobi-pink/silly-upside-down.png')),
  nobiRosa('speechless', 0.81, require('../../public/reader/stickers/nobi-pink/speechless.png')),
  nobiRosa('hiding', 0.762, require('../../public/reader/stickers/nobi-pink/hiding.png')),
  nobiRosa('worried', 0.858, require('../../public/reader/stickers/nobi-pink/worried.png')),
  nobiRosa('annoyed', 0.81, require('../../public/reader/stickers/nobi-pink/annoyed.png')),
  nobiRosa('pissed', 0.81, require('../../public/reader/stickers/nobi-pink/pissed.png')),
  nobiRosa('crying', 0.73, require('../../public/reader/stickers/nobi-pink/crying.png')),
  nobiRosa('puddle-tears', 0.665, require('../../public/reader/stickers/nobi-pink/puddle-tears.png')),
  nobiRosa('puddle-tears-tantrum', 0.665, require('../../public/reader/stickers/nobi-pink/puddle-tears-tantrum.png')),
  nobiRosa('sleeping', 0.86, require('../../public/reader/stickers/nobi-pink/sleeping.png')),
];
/* eslint-enable @typescript-eslint/no-require-imports */

const POR_ID = new Map(STICKERS.map((s) => [s.id, s]));

export function stickerPorId(id: unknown): Sticker | null {
  return typeof id === 'string' ? (POR_ID.get(id) ?? null) : null;
}
