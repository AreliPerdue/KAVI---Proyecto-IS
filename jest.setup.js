/**
 * NOTA para escribir pruebas de UI con @testing-library/react-native v14:
 * `render` y `fireEvent` son ASINCRONOS y hay que esperarlos. Un `fireEvent`
 * sin `await` deja actualizaciones de estado pendientes que rompen las pruebas
 * siguientes del mismo archivo con errores enganosos ("Unable to find an
 * element..."), aunque el arbol se renderice bien.
 *
 * Ademas, RNTL excluye de las consultas los elementos que considera
 * inaccesibles —un TextInput con `editable={false}` o `secureTextEntry`—, asi
 * que para inspeccionarlos hay que pasar `{ includeHiddenElements: true }`.
 */

/**
 * Preparacion comun de las pruebas de UI.
 *
 * `react-native-safe-area-context` lee medidas del sistema operativo que en Jest
 * no existen: sin esto, cualquier pantalla que use `useSafeAreaInsets` revienta.
 * Se devuelven insets fijos para que los layouts sean deterministas.
 */
jest.mock('react-native-safe-area-context', () => {
  const insets = { top: 47, right: 0, bottom: 34, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(insets),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

/**
 * `lucide-react-native` se publica como ESM y Jest no puede requerirlo sin
 * transformarlo. Como los iconos son decorativos —van siempre junto a texto y se
 * ocultan a los lectores de pantalla (kavi-design §5)—, se sustituyen por una
 * vista vacia que conserva las props. El Proxy cubre cualquier icono sin tener
 * que enumerarlos.
 */
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Icono = (nombre) => {
    const C = (props) => React.createElement(View, { ...props, testID: props.testID ?? `icono-${nombre}` });
    C.displayName = nombre;
    return C;
  };
  return new Proxy({}, {
    get: (cache, nombre) => {
      if (nombre === '__esModule') return true;
      if (typeof nombre !== 'string') return undefined;
      if (!cache[nombre]) cache[nombre] = Icono(nombre);
      return cache[nombre];
    },
  });
});


/**
 * Reanimated 4 no se puede simular con su mock oficial: ese importa el propio
 * `index` de la libreria, que arranca `react-native-worklets` y falla sin modulo
 * nativo. Como toda la app usa solo cinco funciones —y en un unico componente,
 * `ui/switch-row`— se sustituyen por su resultado final: en pruebas interesa el
 * estado al que llega la animacion, no los fotogramas intermedios.
 */
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, ScrollView } = require('react-native');
  const animado = (Base) => {
    const C = React.forwardRef((props, ref) => React.createElement(Base, { ...props, ref }));
    C.displayName = `Animated(${Base.displayName ?? 'View'})`;
    return C;
  };
  const Animated = { View: animado(View), Text: animado(Text), ScrollView: animado(ScrollView) };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedStyle: (fn) => fn(),
    useSharedValue: (inicial) => ({ value: inicial }),
    withTiming: (destino) => destino,
    withSpring: (destino) => destino,
    /** Sin fotogramas: se devuelve el extremo al que corresponde el progreso. */
    interpolateColor: (progreso, _entrada, salida) => salida[progreso >= 1 ? salida.length - 1 : 0],
    interpolate: (progreso, _entrada, salida) => salida[progreso >= 1 ? salida.length - 1 : 0],
    useReducedMotion: () => false,
    runOnJS: (fn) => fn,
  };
});

/**
 * React Query agrupa sus notificaciones con un `setTimeout`, que en Jest dispara
 * despues de terminar la prueba: deja un manejador abierto y provoca avisos de
 * "update not wrapped in act". En pruebas se planifica de forma sincrona, que es
 * lo que recomienda la propia libreria.
 */
const { notifyManager } = require('@tanstack/react-query');
notifyManager.setScheduler((callback) => callback());

/**
 * Expo Router depende del arbol de rutas y del contexto de navegacion, que en
 * Jest no existen. Se sustituye por lo minimo que usan las pantallas:
 *  - `Link` con `asChild` devuelve su hijo tal cual, que es lo que hace en la app.
 *  - `router` y `useRouter` exponen espias, para comprobar la navegacion.
 *  - `useLocalSearchParams` se configura por prueba con `setParametrosDeRuta`.
 * Los contenedores de navegacion (`Stack`, `Tabs`) solo pintan a sus hijos.
 */
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
  setParams: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let mockParametrosDeRuta = {};

global.mockRouter = mockRouter;
global.setParametrosDeRuta = (params) => { mockParametrosDeRuta = params ?? {}; };

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  const contenedor = (nombre) => {
    const C = ({ children }) => React.createElement(View, { testID: nombre }, children);
    C.displayName = nombre;
    C.Screen = () => null;
    C.Protected = ({ children }) => children;
    return C;
  };
  return {
    __esModule: true,
    router: mockRouter,
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParametrosDeRuta,
    useGlobalSearchParams: () => mockParametrosDeRuta,
    usePathname: () => '/',
    useSegments: () => [],
    useNavigation: () => ({ setOptions: jest.fn() }),
    useFocusEffect: (efecto) => React.useEffect(efecto, [efecto]),
    Link: ({ children, asChild }) => (asChild ? children : React.createElement(View, null, children)),
    Redirect: () => null,
    Stack: contenedor('stack'),
    Tabs: contenedor('tabs'),
    Slot: ({ children }) => children,
    SplashScreen: { preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() },
  };
});

beforeEach(() => {
  for (const fn of Object.values(mockRouter)) if (typeof fn.mockClear === 'function') fn.mockClear();
  mockParametrosDeRuta = {};
});
