import type { ImageSourcePropType } from 'react-native';

import type { Material } from '@/lib/library/journal';

/**
 * Las texturas de los materiales del Journal (spec 13i, RF-JC7 – RF-JC8; T352): una en grises por material, repetible
 * por los cuatro lados, que se mezcla con `soft-light` sobre el color elegido. Viven en la app (sirven sin red).
 * Están en la carpeta del motor (`public/reader/lienzo/materiales`) para que el motor también las tenga: en la web
 * como archivo y en el teléfono empaquetadas, como los assets del lienzo (T346).
 */
// Las imágenes se empaquetan con `require`.
export const TEXTURAS: Record<Material, ImageSourcePropType> = {
  leather: require('../../public/reader/lienzo/materiales/leather.png'),
  linen: require('../../public/reader/lienzo/materiales/linen.png'),
  velvet: require('../../public/reader/lienzo/materiales/velvet.png'),
  wood: require('../../public/reader/lienzo/materiales/wood.png'),
  fabric: require('../../public/reader/lienzo/materiales/fabric.png'),
  parchment: require('../../public/reader/lienzo/materiales/parchment.png'),
};
