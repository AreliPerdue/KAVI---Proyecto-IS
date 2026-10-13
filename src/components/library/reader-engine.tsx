import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { SITIO } from '@/lib/api';
import { ColaDelMotor, leerMensaje, type MensajeAlMotor, type MensajeDelMotor, URL_MOTOR } from '@/lib/library/reader-protocol';

export type ReaderEngineHandle = { send: (m: MensajeAlMotor) => void };

export type ReaderEngineProps = {
  onMessage: (m: MensajeDelMotor) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * El motor de lectura en el teléfono (spec 13b §4, T279): un WebView con la página del motor. Lo que
 * se manda antes de que diga `ready` espera en una cola. Solo navega dentro de la web de KAVI: el
 * libro lo descarga el motor con `fetch`, no con navegación.
 */
export const ReaderEngine = forwardRef<ReaderEngineHandle, ReaderEngineProps>(function ReaderEngine({ onMessage, style }, ref) {
  const vista = useRef<WebView>(null);
  const cola = useMemo(() => new ColaDelMotor((texto) => vista.current?.postMessage(texto)), []);
  useImperativeHandle(ref, () => ({ send: (m) => cola.enviar(m) }), [cola]);

  const alRecibir = (e: WebViewMessageEvent) => {
    const m = leerMensaje(e.nativeEvent.data);
    if (!m) return;
    if (m.type === 'ready') cola.marcarListo();
    onMessage(m);
  };

  return (
    <WebView
      ref={vista}
      source={{ uri: URL_MOTOR }}
      onMessage={alRecibir}
      onLoadStart={() => cola.reiniciar()}
      onShouldStartLoadWithRequest={(r) => r.url.startsWith(SITIO) || r.url === 'about:blank'}
      originWhitelist={[SITIO]}
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
