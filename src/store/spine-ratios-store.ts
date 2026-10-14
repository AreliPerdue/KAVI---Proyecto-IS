import { create } from 'zustand';

/**
 * La proporción (ancho / alto) de cada imagen de lomo que ya se cargó, por su ruta (RF-BL20, RF-BL2b). El
 * lomo la avisa al cargar su imagen y el librero la usa para saber cuánto mide cada lomo antes de repartirlos
 * en repisas. Vive en memoria: al abrir la app se vuelve a medir con la primera carga de cada imagen.
 */
type SpineRatiosState = {
  porRuta: Record<string, number>;
  poner: (ruta: string, proporcion: number) => void;
};

export const useSpineRatiosStore = create<SpineRatiosState>((set, get) => ({
  porRuta: {},
  poner: (ruta, proporcion) => {
    if (!Number.isFinite(proporcion) || proporcion <= 0) return;
    // Sin cambio no se avisa: el librero no tiene por qué volver a repartir.
    if (Math.abs((get().porRuta[ruta] ?? 0) - proporcion) < 0.001) return;
    set((s) => ({ porRuta: { ...s.porRuta, [ruta]: proporcion } }));
  },
}));
