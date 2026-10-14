import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { SITIO } from '@/lib/api';
import { ColaDelMotor, leerMensaje, type MensajeAlMotor, type MensajeDelMotor, URL_MOTOR } from '@/lib/library/reader-protocol';

export type ReaderEngineHandle = { send: (m: MensajeAlMotor) => void };

export type ReaderEngineProps = {
  onMessage: (m: MensajeDelMotor) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * La página del motor, empaquetada en la app (T285; la arma `scripts/build-reader-bundle.mjs`). Se lee
 * una vez y se reutiliza: pesa unos 4 MB (las letras y los stickers van dentro).
 */
let pagina: Promise<string> | null = null;
function paginaDelMotor(): Promise<string> {
  pagina ??= (async () => {
     
    const [archivo] = await Asset.loadAsync(require('../../../assets/reader/engine.html'));
    return new File(archivo.localUri ?? archivo.uri).text();
  })().catch((e) => {
    pagina = null;
    throw e;
  });
  return pagina;
}

/**
 * El motor de lectura en el teléfono (spec 13b §4; T279, T285): un WebView con la página del motor, que
 * viene dentro de la app para leer sin conexión. Se abre con la web de KAVI como dirección base: así puede
 * pedir a R2 las portadas y, con red, los archivos de apoyo de pdf.js. Lo que se manda antes de que diga
 * `ready` espera en una cola. No navega a ninguna otra parte.
 */
export const ReaderEngine = forwardRef<ReaderEngineHandle, ReaderEngineProps>(function ReaderEngine({ onMessage, style }, ref) {
  const vista = useRef<WebView>(null);
  const cola = useMemo(() => new ColaDelMotor((texto) => vista.current?.postMessage(texto)), []);
  useImperativeHandle(ref, () => ({ send: (m) => cola.enviar(m) }), [cola]);

  const alRecibir = useRef(onMessage);
  useEffect(() => {
    alRecibir.current = onMessage;
  }, [onMessage]);

  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    paginaDelMotor()
      .then((h) => vivo && setHtml(h))
      .catch(() => vivo && alRecibir.current({ type: 'error', code: 'unknown' }));
    return () => {
      vivo = false;
    };
  }, []);

  const recibir = (e: WebViewMessageEvent) => {
    const m = leerMensaje(e.nativeEvent.data);
    if (!m) return;
    if (m.type === 'ready') cola.marcarListo();
    alRecibir.current(m);
  };

  if (!html) return <View style={[styles.motor, style]} />;
  return (
    <WebView
      ref={vista}
      source={{ html, baseUrl: URL_MOTOR }}
      onMessage={recibir}
      onLoadStart={() => cola.reiniciar()}
      onShouldStartLoadWithRequest={(r) => r.url.startsWith(SITIO) || r.url.startsWith('about:') || r.url.startsWith('data:')}
      originWhitelist={[SITIO, 'about:*', 'data:*']}
      setSupportMultipleWindows={false}
      allowsBackForwardNavigationGestures={false}
      webviewDebuggingEnabled={__DEV__}
      // El fondo de la app mientras carga, en vez de un destello blanco.
      style={[styles.motor, style]}
    />
  );
});

const styles = StyleSheet.create({
  motor: { flex: 1, backgroundColor: 'transparent' },
});
