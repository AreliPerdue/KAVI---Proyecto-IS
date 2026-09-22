/**
 * Envoltorio para probar los hooks de datos.
 *
 * Cada prueba recibe su propio `QueryClient` sin reintentos ni cache entre
 * pruebas: con los valores de produccion un error tardaria segundos en
 * propagarse y una prueba veria los datos de la anterior.
 *
 * No es un archivo de pruebas: vive en `__tests__` para quedar fuera de la
 * cobertura.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Clientes creados en el archivo de pruebas en curso. Sin limpiarlos, React
 * Query deja suscripciones vivas y Jest avisa de que no puede cerrar.
 */
const creados: QueryClient[] = [];

afterEach(async () => {
  for (const qc of creados.splice(0)) {
    await qc.cancelQueries();
    qc.clear();
    qc.unmount();
  }
  // Cede el turno para que React termine el desmontaje asincrono de RNTL 14.
  // A proposito sin temporizadores: una prueba con `useFakeTimers` los congela
  // y la limpieza se quedaria esperando hasta agotar el timeout.
  await Promise.resolve();
});

export function crearWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  creados.push(queryClient);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
}
