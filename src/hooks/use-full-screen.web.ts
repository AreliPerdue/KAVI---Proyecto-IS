import { useEffect } from 'react';

/**
 * Pantalla completa para el libro real en la web (spec 13b, RF-BR5; T284): la del navegador. Se pide al
 * elegir el libro real (es un toque de la persona, que el navegador exige) y se suelta al salir del modo o
 * del lector. Esc la quita como siempre; si el navegador no la deja, se lee igual en la ventana.
 */
export function usePantallaCompleta(activa: boolean) {
  useEffect(() => {
    if (!activa || typeof document === 'undefined') return;
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [activa]);
}
