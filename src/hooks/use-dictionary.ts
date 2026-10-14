import { useQuery } from '@tanstack/react-query';

import { definirEnIngles, pareceEspanol } from '@/services/dictionary';

/**
 * La definición de una palabra en inglés (RF-BH8). Las que parecen español no se buscan: para esas el
 * lector ofrece la RAE. Se guarda un día: una palabra no cambia de significado.
 */
export function useDefinition(palabra: string | null) {
  return useQuery({
    queryKey: ['dictionary', 'en', palabra?.toLowerCase() ?? null],
    queryFn: ({ signal }) => definirEnIngles(palabra as string, signal),
    enabled: !!palabra && !pareceEspanol(palabra),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
