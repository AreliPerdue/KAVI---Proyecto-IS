/** Textos de las notificaciones del sistema (spec 12, fase 3). */
export const notifications = {
  today: 'Hoy',
  startsAt: (hora: string) => `Empieza a las ${hora}`,
  sharedBy: (nombre: string) => ` · Compartida por ${nombre}`,
  aContact: 'un contacto',
  listItemFallback: 'Pendiente',
  contactRequestTitle: 'Nueva solicitud de contacto',
  contactRequestBody: (nombre: string) => `${nombre} quiere conectar contigo.`,
  invitedTitle: (nombre: string) => `${nombre} te invitó a una actividad`,
  invitedBody: (titulo: string, cuando: string) => `${titulo} — ${cuando}`,
};
