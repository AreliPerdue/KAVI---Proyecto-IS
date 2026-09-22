/**
 * Invalidacion compartida (RF-S2, NFR-11).
 *
 * Romper una conexion no solo cambia la lista de contactos: el trigger
 * `connections_revoke_shares` revoca en cascada shares y recordatorios, asi que
 * el calendario y la disponibilidad quedan obsoletos en el mismo instante. La
 * lista vive en un unico lugar justo para que nadie se deje una clave fuera; esto
 * lo fija.
 */
import type { QueryClient } from '@tanstack/react-query';

import { invalidateSharedData } from '@/lib/query-invalidation';

function clienteFalso() {
  const llamadas: unknown[] = [];
  const client = {
    invalidateQueries: (args: unknown) => {
      llamadas.push(args);
      return Promise.resolve();
    },
  } as unknown as QueryClient;
  return { client, llamadas };
}

describe('invalidateSharedData', () => {
  it('invalida las cinco familias afectadas', () => {
    const { client, llamadas } = clienteFalso();
    invalidateSharedData(client);
    expect(llamadas).toHaveLength(5);
  });

  it('cubre contactos, actividades, shares, recordatorios y disponibilidad', () => {
    const { client, llamadas } = clienteFalso();
    invalidateSharedData(client);
    const claves = llamadas.map((l) => (l as { queryKey: string[] }).queryKey[0]);
    expect(new Set(claves)).toEqual(
      new Set(['connections', 'activities', 'shares', 'reminders', 'availability']),
    );
  });

  it('no olvida el calendario, que es el fallo que motivo centralizarlo', () => {
    const { client, llamadas } = clienteFalso();
    invalidateSharedData(client);
    const claves = llamadas.map((l) => (l as { queryKey: string[] }).queryKey[0]);
    expect(claves).toContain('activities');
  });

  it('no lanza si el cliente resuelve de inmediato', () => {
    const { client } = clienteFalso();
    expect(() => invalidateSharedData(client)).not.toThrow();
  });
});
