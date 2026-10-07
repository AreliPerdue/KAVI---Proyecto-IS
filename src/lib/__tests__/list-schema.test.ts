/**
 * Formulario de lista (spec 10, §Colores; T199).
 */
import { LIST_COLORS, listFormSchema } from '@/lib/schemas/list';

describe('listFormSchema', () => {
  const valida = { name: 'Súper', color: LIST_COLORS[0], icon: 'cart' };

  it('acepta un color de la paleta de personas', () => {
    expect(listFormSchema.safeParse({ ...valida, icon: 'shopping-cart' }).success).toBe(true);
  });

  it('rechaza un color fuera de la paleta', () => {
    expect(listFormSchema.safeParse({ ...valida, icon: 'shopping-cart', color: '#123456' }).success).toBe(false);
  });

  it('el nombre no puede quedar vacío ni pasar de 40', () => {
    expect(listFormSchema.safeParse({ ...valida, icon: 'shopping-cart', name: '   ' }).success).toBe(false);
    expect(listFormSchema.safeParse({ ...valida, icon: 'shopping-cart', name: 'x'.repeat(41) }).success).toBe(false);
  });
});
