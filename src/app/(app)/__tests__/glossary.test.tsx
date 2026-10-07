/**
 * Pantalla Glosario (spec 07 v2, RF-F64): por temas, con búsqueda sin acentos y `?term=` que
 * abre un término ya desplegado.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import GlossaryScreen from '@/app/(app)/glossary';

declare const setParametrosDeRuta: (p: Record<string, string>) => void;

describe('Glosario', () => {
  it('agrupa por temas', async () => {
    await render(<GlossaryScreen />);
    expect(screen.getByText('Lo básico')).toBeTruthy();
    expect(screen.getByText('Esfuerzo')).toBeTruthy();
  });

  it('busca sin acentos ni mayúsculas, también en "otros nombres"', async () => {
    await render(<GlossaryScreen />);
    await fireEvent.changeText(screen.getByLabelText('Buscar en el glosario'), 'REPETICION');
    expect(screen.getByText('Repetición')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Buscar en el glosario'), 'e1rm');
    expect(screen.getByText('Peso máximo estimado')).toBeTruthy();
  });

  it('al buscar, lo que coincide se abre solo', async () => {
    await render(<GlossaryScreen />);
    await fireEvent.changeText(screen.getByLabelText('Buscar en el glosario'), 'tabata');
    expect(screen.getByText('Ejemplo')).toBeTruthy();
  });

  it('si nada coincide lo dice', async () => {
    await render(<GlossaryScreen />);
    await fireEvent.changeText(screen.getByLabelText('Buscar en el glosario'), 'zzzz');
    expect(screen.getByText('Ningún término dice eso.')).toBeTruthy();
  });

  it('?term=rir abre ese término desplegado', async () => {
    setParametrosDeRuta({ term: 'rir' });
    await render(<GlossaryScreen />);
    expect(screen.getByRole('button', { name: /^Reps en reserva\./ }).props.accessibilityState.expanded).toBe(true);
  });
});
