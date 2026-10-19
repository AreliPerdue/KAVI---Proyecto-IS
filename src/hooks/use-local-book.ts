import { useCallback } from 'react';

import type { FormaDeLeer } from '@/lib/library/reading-mode';
import { asegurarCopia, leerEnPedazos } from '@/lib/library/offline/copies';
import { type MensajeAlMotor, type Posicion, posicionGuardada } from '@/lib/library/reader-protocol';
import { downloadLibraryFile } from '@/services/library';
import type { LibraryItem } from '@/types/domain';

/**
 * Abrir un libro desde su copia en el teléfono (spec 13b, RF-BR3; T285): la baja la primera vez y luego la
 * lee del dispositivo, con o sin red, y se la manda al motor en pedazos. Solo en el teléfono; en la web el
 * motor descarga el libro con su dirección firmada. `posicion`: abrir ahí y no donde se quedó.
 */
export function useAbrirCopiaLocal() {
  return useCallback(async (pieza: LibraryItem, ruta: string, forma: FormaDeLeer, enviar: (m: MensajeAlMotor) => void, posicion?: Posicion) => {
    const archivo = await asegurarCopia(pieza.id, ruta, downloadLibraryFile);
    enviar({ type: 'openBegin', format: pieza.kind === 'epub' ? 'epub' : 'pdf', size: archivo.size, position: posicion ?? posicionGuardada(pieza), mode: forma });
    await leerEnPedazos(archivo, (data) => enviar({ type: 'openChunk', data }));
    enviar({ type: 'openEnd' });
  }, []);
}
