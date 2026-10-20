import type { ClubLiveApi } from '@/services/contracts';
import { demoState } from '@/services/demo/store';
import type { PresenteEnVivo } from '@/types/domain';
import { miembrosDelDemo } from '@/services/demo/library';

/**
 * La sesión en vivo en el demo (13f, T309): los demás miembros son simulados. Cuando empiezas una sesión, los
 * miembros aceptados del club entran a seguirte al rato. No se mueven ni señalan por su cuenta, pero si les pasas
 * el mando lo toman, y quien dirige se queda aunque salgas (así se ve la invitación a volver).
 */
export const demoClubLive: ClubLiveApi = {
  entrar(clubId, yo, eventos) {
    let mio: PresenteEnVivo = { id: yo.id, nombre: yo.nombre, desde: Date.now(), enSesion: false, dirige: false };
    let otros: PresenteEnVivo[] = [];
    let espera: ReturnType<typeof setTimeout> | null = null;
    const avisar = () => eventos.onPresentes([mio, ...otros]);
    setTimeout(avisar, 0);
    return {
      estado(e) {
        mio = { ...mio, ...e };
        if (mio.enSesion && mio.dirige && !otros.length && !espera) {
          // Los simulados llegan a la sesión un momento después.
          espera = setTimeout(() => {
            espera = null;
            otros = miembrosDelDemo(clubId)
              .filter((m) => m.person_id !== yo.id && m.status === 'accepted')
              .map((m, i) => ({
                id: m.person_id,
                nombre: demoState.accounts.find((a) => a.user.id === m.person_id)?.profile.display_name ?? '',
                desde: Date.now() + i,
                enSesion: true,
                dirige: false,
              }));
            avisar();
          }, 1200);
          (espera as unknown as { unref?: () => void }).unref?.();
        }
        // Si salgo y nadie más dirige, los simulados se van conmigo.
        if (!mio.enSesion && !otros.some((o) => o.dirige)) otros = [];
        avisar();
      },
      mover: () => undefined,
      senalar: () => undefined,
      pasarMando(para) {
        otros = otros.map((o) => ({ ...o, dirige: o.id === para }));
        avisar();
      },
      salir() {
        if (espera) clearTimeout(espera);
      },
    };
  },
  avisar: () => undefined,
  escucharAvisos: () => () => undefined,
};
