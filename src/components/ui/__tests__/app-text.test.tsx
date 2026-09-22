/**
 * AppText concentra toda la tipografia del producto (kavi-design §2): si algo se
 * rompe aqui, se rompe en cada pantalla.
 */
import { render, screen } from '@testing-library/react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors, Typography } from '@/constants/theme';

const estiloDe = (n: { props: { style?: unknown } }) =>
  Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));

describe('AppText', () => {
  it('muestra el contenido', async () => {
    await render(<AppText>Hola</AppText>);
    expect(screen.getByText('Hola')).toBeTruthy();
  });

  it('usa la variante body por defecto', async () => {
    await render(<AppText>Texto</AppText>);
    expect(estiloDe(screen.getByText('Texto'))).toMatchObject(Typography.body);
  });

  it.each(['display', 'title', 'heading', 'bodyStrong', 'label', 'caption'] as const)(
    'aplica la escala de la variante %s',
    async (variant) => {
      await render(<AppText variant={variant}>X</AppText>);
      expect(estiloDe(screen.getByText('X')).fontSize).toBe(Typography[variant].fontSize);
    },
  );

  it('usa el color de texto primario por defecto', async () => {
    await render(<AppText>Texto</AppText>);
    expect(estiloDe(screen.getByText('Texto')).color).toBe(Colors.dark.text);
  });

  it.each(['textSecondary', 'textTertiary', 'danger', 'success'] as const)(
    'acepta el token de color %s',
    async (color) => {
      await render(<AppText color={color}>X</AppText>);
      expect(estiloDe(screen.getByText('X')).color).toBe(Colors.dark[color]);
    },
  );

  it('activa numeros tabulares para horas y fechas', async () => {
    await render(<AppText tabular>14:30</AppText>);
    expect(estiloDe(screen.getByText('14:30')).fontVariant).toEqual(['tabular-nums']);
  });

  it('no los activa por defecto', async () => {
    await render(<AppText>14:30</AppText>);
    expect(estiloDe(screen.getByText('14:30')).fontVariant).toBeUndefined();
  });

  it('el estilo propio gana sobre el de la variante', async () => {
    await render(<AppText style={{ fontSize: 99 }}>X</AppText>);
    expect(estiloDe(screen.getByText('X')).fontSize).toBe(99);
  });

  it('deja pasar las props de accesibilidad', async () => {
    await render(<AppText accessibilityRole="header">Titulo</AppText>);
    expect(screen.getByRole('header')).toBeTruthy();
  });

  it('respeta numberOfLines', async () => {
    await render(<AppText numberOfLines={1}>Largo</AppText>);
    expect(screen.getByText('Largo').props.numberOfLines).toBe(1);
  });
});
