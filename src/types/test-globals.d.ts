/**
 * Globales que `jest.setup.js` expone a las pruebas de pantallas.
 *
 * El mock de Expo Router vive en el setup para no repetirlo en cada archivo, y
 * estas son su superficie: el enrutador espiado, la forma de fijar los parametros
 * de ruta que la pantalla leera con `useLocalSearchParams`, y el disparador de los
 * eventos del navegador de pestanas.
 */
declare global {
  var mockRouter: {
    push: jest.Mock;
    replace: jest.Mock;
    back: jest.Mock;
    navigate: jest.Mock;
    dismiss: jest.Mock;
    dismissAll: jest.Mock;
    setParams: jest.Mock;
    canGoBack: jest.Mock;
  };
  var setParametrosDeRuta: (params?: Record<string, string | undefined>) => void;
  /** Dispara los oyentes registrados con `navigation.addListener`. */
  var dispararEventoDeNavegacion: (evento: string) => void;
}

export {};
