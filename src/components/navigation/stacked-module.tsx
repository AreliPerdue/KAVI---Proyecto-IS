import { createContext, useContext } from 'react';

import { ModalHeader } from '@/components/modal-header';

/**
 * Un módulo abierto desde Más porque no está en la barra (spec 01, RF-N3) se pinta como
 * pantalla apilada. La pantalla es la misma que la pestaña; solo cambia que lleva "Atrás".
 */
export const StackedModuleContext = createContext(false);

/** Va al principio de cada pantalla de módulo: en la barra no pinta nada; apilado, "Atrás". */
export function StackedModuleBack() {
  const apilado = useContext(StackedModuleContext);
  return apilado ? <ModalHeader back title="" /> : null;
}
