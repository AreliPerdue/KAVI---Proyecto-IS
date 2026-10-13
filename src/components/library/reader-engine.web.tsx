import { createElement, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ColaDelMotor, leerMensaje, type MensajeDelMotor, URL_MOTOR } from '@/lib/library/reader-protocol';

import type { ReaderEngineHandle, ReaderEngineProps } from './reader-engine';

export type { ReaderEngineHandle, ReaderEngineProps } from './reader-engine';

/**
 * El motor de lectura en la web (spec 13b §4, T279): la misma página que en el teléfono, en un
 * iframe del mismo origen. Los mensajes van con `postMessage` y solo se aceptan de ese iframe y de
 * este origen.
 */
export const ReaderEngine = forwardRef<ReaderEngineHandle, ReaderEngineProps>(function ReaderEngine({ onMessage, style }, ref) {
  const marco = useRef<HTMLIFrameElement | null>(null);
  const cola = useMemo(
    () => new ColaDelMotor((texto) => marco.current?.contentWindow?.postMessage({ kaviApp: texto }, window.location.origin)),
    [],
  );
  useImperativeHandle(ref, () => ({ send: (m) => cola.enviar(m) }), [cola]);

  const alRecibir = useRef(onMessage);
  useEffect(() => {
    alRecibir.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const escuchar = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== marco.current?.contentWindow) return;
      const m: MensajeDelMotor | null = leerMensaje((e.data as { kaviReader?: unknown } | null)?.kaviReader);
      if (!m) return;
      if (m.type === 'ready') cola.marcarListo();
      alRecibir.current(m);
    };
    window.addEventListener('message', escuchar);
    return () => window.removeEventListener('message', escuchar);
  }, [cola]);

  return (
    <View style={[styles.motor, style]}>
      {createElement('iframe', {
        ref: marco,
        src: URL_MOTOR,
        title: 'KAVI Library',
        style: { border: 0, width: '100%', height: '100%', display: 'block', background: 'transparent' },
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  motor: { flex: 1 },
});
