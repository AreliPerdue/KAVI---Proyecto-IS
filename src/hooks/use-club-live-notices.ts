import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useClubs } from '@/hooks/use-clubs';
import { useT } from '@/i18n';
import { useAuth, useSnackbar } from '@/providers';
import { escucharAvisosEnVivo } from '@/services/club-live';

/**
 * "Ana está leyendo Rayuela en vivo" (spec 13f, RF-BC10; T309): mientras la app está abierta, los miembros de
 * un club reciben el aviso cuando alguien empieza una sesión, y entran con un toque (el lector se une solo).
 */
export function useClubLiveNotices() {
  const { userId } = useAuth();
  const { members } = useClubs();
  const avisar = useSnackbar();
  const router = useRouter();
  const t = useT().library.clubs.live;
  // Mis copias de cada club en el que estoy.
  const copias = new Map(members.filter((m) => m.person_id === userId && m.status === 'accepted' && m.item_id).map((m) => [m.club_id, m.item_id as string]));
  const clave = [...copias.keys()].sort().join(',');
  const ultimo = useRef({ copias, avisar, router, t });
  useEffect(() => {
    ultimo.current = { copias, avisar, router, t };
  });

  useEffect(() => {
    const ids = clave ? clave.split(',') : [];
    if (!ids.length) return;
    return escucharAvisosEnVivo(ids, (clubId, aviso) => {
      const { copias: mias, avisar: mostrar, router: r, t: textos } = ultimo.current;
      const copia = mias.get(clubId);
      if (!copia) return;
      mostrar({
        message: textos.notice(aviso.quien, aviso.libro),
        actionLabel: textos.enter,
        onAction: () => r.push({ pathname: '/(app)/book/[id]', params: { id: copia, vivo: '1' } }),
      });
    });
  }, [clave]);
}
