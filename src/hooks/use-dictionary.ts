import { useQuery } from '@tanstack/react-query';

import { definirEnIngles, idiomaEspanol, pareceEspanol } from '@/services/dictionary';

/**
 * La definición de una palabra en inglés (RF-BH8). Las que son del español (por el idioma del libro o por
 * sus letras) no se buscan: para esas el lector ofrece la RAE. Se guarda un día: una palabra no cambia de
 * significado.
 */
export function useDefinition(palabra: string | null, idiomaDelLibro: string | null = null) {
  return useQuery({
    queryKey: ['dictionary', 'en', palabra?.toLowerCase() ?? null],
    queryFn: ({ signal }) => definirEnIngles(palabra as string, signal),
    enabled: !!palabra && !pareceEspanol(palabra) && !idiomaEspanol(idiomaDelLibro),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
