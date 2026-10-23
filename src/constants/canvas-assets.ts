import type { ImageSourcePropType } from 'react-native';

/**
 * Los assets del lienzo creativo (spec 13h, RF-CC15 – RF-CC17; T343b): papeles, notas, cintas y doodles en grises,
 * sin fondo. Este primer pack ("básicos") viene incluido para que el lienzo sirva sin red; los hace
 * `scripts/library/assets-lienzo.mjs`. Un asset pegado guarda `content.asset = '<pack>/<nombre>'`.
 *
 * Se recolorean con un HEX (RF-CC13): los de **textura** (papeles, notas, cintas) multiplican el color sobre su gris y
 * conservan fibras, pliegues y rayas; los de **trazo** (doodles) toman el color tal cual en su línea.
 */

export const CATEGORIAS_DE_ASSET = ['papel', 'nota', 'cinta', 'doodle'] as const;
export type CategoriaDeAsset = (typeof CATEGORIAS_DE_ASSET)[number];
export type ModoDeAsset = 'textura' | 'trazo';

export type NombreDeAsset =
  | 'papel-rasgado'
  | 'papel-arrugado'
  | 'hoja-de-libreta'
  | 'papel-cuadriculado'
  | 'papel-punteado'
  | 'papel-esquina-doblada'
  | 'papel-con-fibras'
  | 'tira-rasgada'
  | 'memo'
  | 'ticket'
  | 'etiqueta'
  | 'marcapaginas'
  | 'cinta-lisa'
  | 'cinta-rayas'
  | 'cinta-puntos'
  | 'cinta-cuadros'
  | 'destellos'
  | 'flecha-curva'
  | 'rama'
  | 'lazo'
  | 'costura'
  | 'corazon-a-mano'
  | 'estrella-a-mano'
  | 'circulo-a-mano';

export type AssetDeLienzo = {
  /** `<pack>/<nombre>`: lo que se guarda en el elemento. */
  id: string;
  nombre: NombreDeAsset;
  categoria: CategoriaDeAsset;
  modo: ModoDeAsset;
  /** Alto entre ancho de la imagen: así se pega sin deformarse. */
  ar: number;
  imagen: ImageSourcePropType;
};

const pieza = (nombre: NombreDeAsset, categoria: CategoriaDeAsset, modo: ModoDeAsset, ar: number, imagen: ImageSourcePropType): AssetDeLienzo => ({
  id: `basicos/${nombre}`,
  nombre,
  categoria,
  modo,
  ar,
  imagen,
});

// Las imágenes se empaquetan con `require`.
export const ASSETS_DE_LIENZO: readonly AssetDeLienzo[] = [
  pieza('papel-rasgado', 'papel', 'textura', 1.225, require('../../public/reader/lienzo/basicos/papel-rasgado.png')),
  pieza('papel-arrugado', 'papel', 'textura', 1.162, require('../../public/reader/lienzo/basicos/papel-arrugado.png')),
  pieza('hoja-de-libreta', 'papel', 'textura', 1.299, require('../../public/reader/lienzo/basicos/hoja-de-libreta.png')),
  pieza('papel-cuadriculado', 'papel', 'textura', 1.000, require('../../public/reader/lienzo/basicos/papel-cuadriculado.png')),
  pieza('papel-punteado', 'papel', 'textura', 1.000, require('../../public/reader/lienzo/basicos/papel-punteado.png')),
  pieza('papel-esquina-doblada', 'papel', 'textura', 1.000, require('../../public/reader/lienzo/basicos/papel-esquina-doblada.png')),
  pieza('papel-con-fibras', 'papel', 'textura', 1.129, require('../../public/reader/lienzo/basicos/papel-con-fibras.png')),
  pieza('tira-rasgada', 'papel', 'textura', 0.242, require('../../public/reader/lienzo/basicos/tira-rasgada.png')),
  pieza('memo', 'nota', 'textura', 1.071, require('../../public/reader/lienzo/basicos/memo.png')),
  pieza('ticket', 'nota', 'textura', 0.429, require('../../public/reader/lienzo/basicos/ticket.png')),
  pieza('etiqueta', 'nota', 'textura', 1.522, require('../../public/reader/lienzo/basicos/etiqueta.png')),
  pieza('marcapaginas', 'nota', 'textura', 3.457, require('../../public/reader/lienzo/basicos/marcapaginas.png')),
  pieza('cinta-lisa', 'cinta', 'textura', 0.210, require('../../public/reader/lienzo/basicos/cinta-lisa.png')),
  pieza('cinta-rayas', 'cinta', 'textura', 0.210, require('../../public/reader/lienzo/basicos/cinta-rayas.png')),
  pieza('cinta-puntos', 'cinta', 'textura', 0.210, require('../../public/reader/lienzo/basicos/cinta-puntos.png')),
  pieza('cinta-cuadros', 'cinta', 'textura', 0.210, require('../../public/reader/lienzo/basicos/cinta-cuadros.png')),
  pieza('destellos', 'doodle', 'trazo', 1.000, require('../../public/reader/lienzo/basicos/destellos.png')),
  pieza('flecha-curva', 'doodle', 'trazo', 0.577, require('../../public/reader/lienzo/basicos/flecha-curva.png')),
  pieza('rama', 'doodle', 'trazo', 1.750, require('../../public/reader/lienzo/basicos/rama.png')),
  pieza('lazo', 'doodle', 'trazo', 0.783, require('../../public/reader/lienzo/basicos/lazo.png')),
  pieza('costura', 'doodle', 'trazo', 0.188, require('../../public/reader/lienzo/basicos/costura.png')),
  pieza('corazon-a-mano', 'doodle', 'trazo', 0.950, require('../../public/reader/lienzo/basicos/corazon-a-mano.png')),
  pieza('estrella-a-mano', 'doodle', 'trazo', 1.000, require('../../public/reader/lienzo/basicos/estrella-a-mano.png')),
  pieza('circulo-a-mano', 'doodle', 'trazo', 0.731, require('../../public/reader/lienzo/basicos/circulo-a-mano.png')),
];

const POR_ID = new Map(ASSETS_DE_LIENZO.map((a) => [a.id, a]));

export function assetPorId(id: unknown): AssetDeLienzo | null {
  return typeof id === 'string' ? (POR_ID.get(id) ?? null) : null;
}

/**
 * Fondo de mesa para ver las piezas antes de pegarlas (pedido de Areli, 22 oct): los doodles son trazo negro y los
 * papeles casi blancos, y sobre el fondo oscuro o el claro de la app uno de los dos se pierde. Es solo para mostrarlas;
 * las piezas siguen sin fondo al pegarlas.
 */
export const FONDO_DE_VISTA_PREVIA = '#DCD6CC';
