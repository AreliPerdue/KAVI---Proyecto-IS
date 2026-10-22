import type { ImageSourcePropType } from 'react-native';

import type { Material } from '@/lib/library/journal';

/**
 * Las texturas de los materiales del Journal (spec 13i, RF-JC7 – RF-JC8; T352): una en grises por material, repetible
 * por los cuatro lados, que se mezcla con `soft-light` sobre el color elegido. Viven en la app (sirven sin red).
 */
// Las imágenes se empaquetan con `require`.
export const TEXTURAS: Record<Material, ImageSourcePropType> = {
  leather: require('../../assets/library/materials/leather.png'),
  linen: require('../../assets/library/materials/linen.png'),
  velvet: require('../../assets/library/materials/velvet.png'),
  wood: require('../../assets/library/materials/wood.png'),
  fabric: require('../../assets/library/materials/fabric.png'),
  parchment: require('../../assets/library/materials/parchment.png'),
};
