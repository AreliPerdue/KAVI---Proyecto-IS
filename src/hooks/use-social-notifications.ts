import { useEffect, useRef } from 'react';

import { useContacts } from '@/hooks/use-connections';
import { useInvitations } from '@/hooks/use-shares';
import { formatShortDate, formatTime, fromIso } from '@/lib/dates';
import { presentNow } from '@/lib/notifications';

/** Nombre de pila, que es como se nombra a las personas en toda la app. */
function nombreDe(perfil: { display_name: string | null; username: string }): string {
  return perfil.display_name?.split(' ')[0] ?? perfil.username;
}

/**
 * Avisa de lo que llega de otras personas (RF-S17): solicitudes de contacto e
 * invitaciones a actividades.
 *
 * No se suscribe a Realtime por su cuenta: aprovecha que `useRealtimeInvalidation`
 * ya refresca estas dos consultas cuando el backend avisa de un cambio. Aquí solo se
 * compara lo que hay ahora con lo que había, y se notifica la diferencia. Así los
 * datos siguen llegando por la capa de servicios —y por tanto bajo las mismas reglas
 * de acceso— en lugar de transportarse dentro del evento de Realtime.
 *
 * **Alcance real:** una notificación local solo puede dispararse si la app está
 * ejecutándose. Con la app cerrada haría falta push desde un servidor, que está
 * anotado en el plan de mejora. Mientras tanto, lo que llega estando cerrada se ve
 * igualmente en la pantalla de Compartido, con su contador.
 */
export function useSocialNotifications() {
  const contacts = useContacts();
  const invitations = useInvitations();

  /**
   * Lo ya visto. Arranca en `null` para distinguir «primera carga» de «no había
   * nada»: sin esa distinción, abrir la app notificaría de golpe todo lo que
   * estuviera pendiente desde hace días.
   */
  const solicitudesVistas = useRef<Set<string> | null>(null);
  const invitacionesVistas = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!contacts.isSuccess) return;
    const entrantes = (contacts.data ?? []).filter((c) => c.kind === 'incoming');
    const ids = new Set(entrantes.map((c) => c.connection.id));

    if (solicitudesVistas.current === null) {
      solicitudesVistas.current = ids;
      return;
    }
    const previas = solicitudesVistas.current;
    for (const contacto of entrantes) {
      if (previas.has(contacto.connection.id)) continue;
      void presentNow(
        'Nueva solicitud de contacto',
        `${nombreDe(contacto.profile)} quiere conectar contigo.`,
        { tipo: 'solicitud' },
      );
    }
    solicitudesVistas.current = ids;
  }, [contacts.isSuccess, contacts.data]);

  useEffect(() => {
    if (!invitations.isSuccess) return;
    const lista = invitations.data ?? [];
    const ids = new Set(lista.map((i) => i.share.id));

    if (invitacionesVistas.current === null) {
      invitacionesVistas.current = ids;
      return;
    }
    const previas = invitacionesVistas.current;
    for (const invitacion of lista) {
      if (previas.has(invitacion.share.id)) continue;
      const inicio = fromIso(invitacion.activity.start_at);
      const cuando = invitacion.activity.all_day
        ? formatShortDate(inicio)
        : `${formatShortDate(inicio)} · ${formatTime(inicio)}`;
      void presentNow(
        `${nombreDe(invitacion.owner)} te invitó a una actividad`,
        `${invitacion.activity.title} — ${cuando}`,
        { tipo: 'invitacion', actividadId: invitacion.activity.id },
      );
    }
    invitacionesVistas.current = ids;
  }, [invitations.isSuccess, invitations.data]);
}
