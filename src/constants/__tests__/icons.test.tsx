/**
 * Set curado de iconos (RF-T2).
 *
 * `ThemeIcon` cae a una etiqueta generica cuando el nombre no esta en el catalogo, y
 * eso es silencioso: no falla, solo pinta el icono equivocado. Por eso se comprueba
 * que los nombres que la app **genera por su cuenta** —las capas derivadas del
 * calendario, que nadie elige a mano— esten en el catalogo. Al cumpleanos le paso:
 * pedia 'cake', no estaba, y salia una etiqueta.
 */
import { render, screen } from '@testing-library/react-native';

import { BIRTHDAY_ICON, WORKOUT_ICON } from '@/components/calendar/derived';
import { ThemeIcon } from '@/components/ui/icon';
import { isThemeIconName, THEME_ICONS, THEME_ICON_NAMES } from '@/constants/icons';

describe('los iconos que la app genera sola', () => {
  it('el del cumpleanos esta en el catalogo', () => {
    expect(isThemeIconName(BIRTHDAY_ICON)).toBe(true);
  });

  it('y el del entrenamiento tambien', () => {
    expect(isThemeIconName(WORKOUT_ICON)).toBe(true);
  });
});

describe('catalogo', () => {
  it('los nombres publicados coinciden con las claves', () => {
    expect(THEME_ICON_NAMES.sort()).toEqual(Object.keys(THEME_ICONS).sort());
  });

  it('un nombre desconocido no se toma por valido', () => {
    expect(isThemeIconName('no-existe')).toBe(false);
    expect(isThemeIconName(null)).toBe(false);
    expect(isThemeIconName(undefined)).toBe(false);
  });

  it('ofrece al menos los treinta que pide la spec', () => {
    expect(THEME_ICON_NAMES.length).toBeGreaterThanOrEqual(30);
  });
});

/**
 * El fallback de `ThemeIcon` es silencioso —pinta una etiqueta y no falla—, asi que se
 * comprueba contra el componente y no solo contra el catalogo.
 */
describe('ThemeIcon', () => {
  it('el cumpleanos pinta un pastel y no la etiqueta generica', async () => {
    await render(<ThemeIcon name={BIRTHDAY_ICON} color="#FFFFFF" />);

    expect(screen.getByTestId('icono-Cake')).toBeTruthy();
    expect(screen.queryByTestId('icono-Tag')).toBeNull();
  });

  it('un nombre desconocido si cae a la etiqueta', async () => {
    await render(<ThemeIcon name="no-existe" color="#FFFFFF" />);

    expect(screen.getByTestId('icono-Tag')).toBeTruthy();
  });
});
