import { getSupabase } from '@/lib/supabase';
import type { ClubLiveApi } from '@/services/contracts';
import type { LibraryLocator, PosicionEnVivo, PresenteEnVivo } from '@/types/domain';

type Meta = { nombre?: string; desde?: number; enSesion?: boolean; dirige?: boolean; pos?: PosicionEnVivo };

/**
 * Sesión en vivo de un club con Supabase Realtime (13f, RF-BC10 – RF-BC14; T309): canales privados (la base
 * deja entrar solo a miembros aceptados), presence para quién está y broadcast para lo que hace quien dirige.
 */
export const supabaseClubLive: ClubLiveApi = {
  entrar(clubId, yo, eventos) {
    const supabase = getSupabase();
    const canal = supabase.channel(`club-vivo:${clubId}`, { config: { private: true, presence: { key: yo.id }, broadcast: { self: false } } });
    let mio: Meta = { nombre: yo.nombre, desde: Date.now(), enSesion: false, dirige: false };
    let listo = false;
    let cerrado = false;

    canal.on('presence', { event: 'sync' }, () => {
      const estado = canal.presenceState<Meta>();
      const presentes: PresenteEnVivo[] = Object.entries(estado).flatMap(([id, metas]) => {
        const m = metas[metas.length - 1];
        return m ? [{ id, nombre: m.nombre ?? '', desde: m.desde ?? 0, enSesion: m.enSesion === true, dirige: m.dirige === true, ...(m.pos ? { pos: m.pos } : {}) }] : [];
      });
      eventos.onPresentes(presentes);
    });
    canal.on('broadcast', { event: 'mover' }, ({ payload }) => eventos.onMover(payload.pos as PosicionEnVivo, String(payload.por)));
    canal.on('broadcast', { event: 'senalar' }, ({ payload }) => eventos.onSenalar(payload.locator as LibraryLocator, String(payload.por)));
    canal.on('broadcast', { event: 'mando' }, ({ payload }) => eventos.onMando(String(payload.para), String(payload.por)));

    // Un canal privado necesita la sesión de quien entra.
    void supabase.realtime.setAuth().then(() => {
      if (cerrado) return;
      canal.subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        listo = true;
        void canal.track(mio);
      });
    });

    const mandar = (event: string, payload: Record<string, unknown>) => {
      if (listo) void canal.send({ type: 'broadcast', event, payload: { ...payload, por: yo.id } });
    };
    return {
      estado(e) {
        mio = { ...mio, ...e };
        if (listo) void canal.track(mio);
      },
      mover: (pos) => mandar('mover', { pos }),
      senalar: (locator) => mandar('senalar', { locator }),
      pasarMando: (para) => mandar('mando', { para }),
      salir() {
        cerrado = true;
        void canal.untrack();
        void supabase.removeChannel(canal);
      },
    };
  },

  avisar(clubId, aviso) {
    const supabase = getSupabase();
    const canal = supabase.channel(`club-avisos:${clubId}`, { config: { private: true } });
    void supabase.realtime.setAuth().then(() =>
      canal.subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        void canal.send({ type: 'broadcast', event: 'empieza', payload: aviso }).finally(() => void supabase.removeChannel(canal));
      }),
    );
  },

  escucharAvisos(clubIds, onAviso) {
    const supabase = getSupabase();
    const canales = clubIds.map((id) => {
      const canal = supabase.channel(`club-avisos:${id}`, { config: { private: true } });
      canal.on('broadcast', { event: 'empieza' }, ({ payload }) => onAviso(id, { quien: String(payload.quien ?? ''), libro: String(payload.libro ?? '') }));
      return canal;
    });
    void supabase.realtime.setAuth().then(() => canales.forEach((c) => c.subscribe()));
    return () => canales.forEach((c) => void supabase.removeChannel(c));
  },
};
