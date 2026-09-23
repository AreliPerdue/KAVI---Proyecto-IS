/**
 * El esquema se reparte por contexto y no lo resuelve cada componente por su cuenta.
 *
 * Con una suscripcion por componente basta con que uno no se vuelva a renderizar para
 * que se quede pintado con el tema anterior, y la pantalla queda a medias: fondos
 * oscuros con contenido claro. Es lo que pasaba en Android bajo la barra de pestanas
 * nativa, que mantiene montadas las pantallas y no las re-renderiza al cambiar un
 * estado de arriba. Esta prueba reproduce ese escenario con un padre memoizado.
 */
import { act, render, screen } from '@testing-library/react-native';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { ThemeSchemeProvider, useTheme } from '@/hooks/use-theme';
import { usePreferencesStore } from '@/store/preferences-store';

function Fondo() {
  const theme = useTheme();
  return <Text testID="fondo">{theme.background}</Text>;
}

/** Nunca recibe props nuevas, asi que React puede saltarse su render por completo. */
const PadreMemoizado = memo(function PadreMemoizado() {
  return (
    <View>
      <Fondo />
    </View>
  );
});

it('un consumidor bajo un padre memoizado sigue el esquema del contexto', async () => {
  const { rerender } = await render(
    <ThemeSchemeProvider scheme="dark">
      <PadreMemoizado />
    </ThemeSchemeProvider>,
  );
  expect(screen.getByTestId('fondo')).toHaveTextContent(Colors.dark.background);

  await act(async () => {
    rerender(
      <ThemeSchemeProvider scheme="light">
        <PadreMemoizado />
      </ThemeSchemeProvider>,
    );
  });

  expect(screen.getByTestId('fondo')).toHaveTextContent(Colors.light.background);
});

/** Montar un componente suelto —una prueba, una hoja— tiene que seguir funcionando. */
it('sin proveedor se resuelve desde la preferencia', async () => {
  usePreferencesStore.setState({ appearance: 'light' });

  await render(<Fondo />);

  expect(screen.getByTestId('fondo')).toHaveTextContent(Colors.light.background);
  usePreferencesStore.setState({ appearance: 'dark' });
});

/** El contexto manda: es la unica fuente mientras la app este montada. */
it('el contexto manda sobre la preferencia suelta', async () => {
  usePreferencesStore.setState({ appearance: 'dark' });

  await render(
    <ThemeSchemeProvider scheme="light">
      <Fondo />
    </ThemeSchemeProvider>,
  );

  expect(screen.getByTestId('fondo')).toHaveTextContent(Colors.light.background);
});
