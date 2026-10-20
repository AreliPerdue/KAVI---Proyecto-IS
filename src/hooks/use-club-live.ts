import { useCallback, useEffect, useRef, useState } from 'react';

import { mismoLugar, quienDirige } from '@/lib/library/club-live';
import { avisarEnVivo, entrarEnVivo } from '@/services/club-live';
import type { SesionEnVivo } from '@/services/contracts';
import type { LibraryLocator, PosicionEnVivo, PresenteEnVivo } from '@/types/domain';

/**
 * La sesión en vivo del club mientras se lee su copia (spec 13f, RF-BC10 – RF-BC14; T309). Al abrir la copia se
 * entra al canal (se ve quién está); empezar o unirse es aparte. Quien dirige manda su lugar y lo que señala;
 * quien sigue llega ahí (`alMover`, `alSenalar`). Soltarse deja de moverse con quien dirige.
 */
export function useClubLive({
  clubId,
  yo,
  libro,
  alMover,
  alSenalar,
}: {
  clubId: string | null;
  yo: { id: string; nombre: string } | null;
  libro: string;
  alMover: (pos: PosicionEnVivo) => void;
  alSenalar: (locator: LibraryLocator) => void;
}) {
  const [presentes, setPresentes] = useState<PresenteEnVivo[]>([]);
  const [enSesion, setEnSesion] = useState(false);
  const [siguiendo, setSiguiendo] = useState(true);
  const sesion = useRef<SesionEnVivo | null>(null);
  // Desde cuándo estoy en la sesión: lo fijan empezar y unirme, antes de que nada lo lea.
  const desde = useRef(0);
  const ultima = useRef<PosicionEnVivo | null>(null);
  // Lo que cambia sin volver a entrar al canal: quién dirige ahora, si sigo, y a qué llamar.
  const vivo = useRef({ enSesion, siguiendo, liderId: null as string | null, alMover, alSenalar });
  const lider = quienDirige(presentes);
  const liderId = lider?.id ?? null;
  useEffect(() => {
    vivo.current = { enSesion, siguiendo, liderId, alMover, alSenalar };
  });

  const yoId = yo?.id ?? null;
  const yoNombre = yo?.nombre ?? '';
  useEffect(() => {
    if (!clubId || !yoId) return;
    const s = entrarEnVivo(clubId, { id: yoId, nombre: yoNombre }, {
      onPresentes: setPresentes,
      onMover: (pos, por) => {
        const v = vivo.current;
        if (v.enSesion && v.siguiendo && por === v.liderId) v.alMover(pos);
      },
      onSenalar: (locator, por) => {
        const v = vivo.current;
        if (v.enSesion && por === v.liderId) v.alSenalar(locator);
      },
      onMando: (para) => {
        if (para === yoId && vivo.current.enSesion) s.estado({ enSesion: true, dirige: true, desde: desde.current });
      },
    });
    sesion.current = s;
    return () => {
      s.salir();
      sesion.current = null;
    };
  }, [clubId, yoId, yoNombre]);

  const hay = presentes.some((p) => p.enSesion);
  const yoDirijo = enSesion && lider?.id === yoId;
  const declarado = presentes.find((p) => p.id === yoId)?.dirige === true;

  // Si quien dirigía se fue y ahora me toca (RF-BC14), lo digo para que todos lo vean igual.
  useEffect(() => {
    if (yoDirijo && !declarado) sesion.current?.estado({ enSesion: true, dirige: true, desde: desde.current });
  }, [yoDirijo, declarado]);

  const empezar = useCallback(() => {
    desde.current = Date.now();
    setEnSesion(true);
    setSiguiendo(true);
    sesion.current?.estado({ enSesion: true, dirige: true, desde: desde.current });
    if (clubId) avisarEnVivo(clubId, { quien: yoNombre, libro });
  }, [clubId, yoNombre, libro]);

  const liderPos = lider?.pos;
  const unirme = useCallback(() => {
    desde.current = Date.now();
    setEnSesion(true);
    setSiguiendo(true);
    sesion.current?.estado({ enSesion: true, dirige: false, desde: desde.current });
    if (liderPos) alMover(liderPos);
  }, [liderPos, alMover]);

  const seguir = useCallback(() => {
    setSiguiendo(true);
    if (liderPos) alMover(liderPos);
  }, [liderPos, alMover]);

  const salir = useCallback(() => {
    setEnSesion(false);
    sesion.current?.estado({ enSesion: false, dirige: false, desde: desde.current });
  }, []);

  const pasarMando = useCallback((para: string) => {
    sesion.current?.pasarMando(para);
    sesion.current?.estado({ enSesion: true, dirige: false, desde: desde.current });
    setSiguiendo(true);
  }, []);

  /**
   * Quien dirige avisa dónde va cada vez que se mueve, y lo deja en su presencia: así quien se une o vuelve a
   * seguir llega ahí sin esperar al siguiente cambio de página.
   */
  const moverme = useCallback(
    (pos: PosicionEnVivo | null) => {
      if (!pos || !yoDirijo || mismoLugar(pos, ultima.current)) return;
      ultima.current = pos;
      sesion.current?.mover(pos);
      sesion.current?.estado({ enSesion: true, dirige: true, desde: desde.current, pos });
    },
    [yoDirijo],
  );

  const senalar = useCallback(
    (locator: LibraryLocator) => {
      if (yoDirijo) sesion.current?.senalar(locator);
    },
    [yoDirijo],
  );

  return {
    presentes,
    hay,
    enSesion,
    siguiendo,
    lider,
    yoDirijo,
    empezar,
    unirme,
    salir,
    pasarMando,
    soltarme: () => setSiguiendo(false),
    seguir,
    moverme,
    senalar,
  };
}
