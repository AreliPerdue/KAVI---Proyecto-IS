/**
 * Estados de carga, vacio y error (NFR-11). Son obligatorios en cada pantalla,
 * asi que su contrato conviene tenerlo fijado.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/states';


/**
 * RNTL no indexa por rol los `View` contenedores que no llevan `accessible`,
 * asi que el rol se comprueba sobre el arbol renderizado.
 */
const tieneRol = (rol: string) => JSON.stringify(screen.toJSON()).includes(`"accessibilityRole":"${rol}"`);

describe('LoadingState', () => {
  it('usa un texto por defecto', async () => {
    await render(<LoadingState />);
    expect(screen.getByText('Cargando…')).toBeTruthy();
  });

  it('acepta una etiqueta propia', async () => {
    await render(<LoadingState label="Buscando contactos…" />);
    expect(screen.getByText('Buscando contactos…')).toBeTruthy();
  });

  it('anuncia el cambio a los lectores de pantalla', async () => {
    await render(<LoadingState />);
    expect(screen.getByText('Cargando…')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('muestra el titulo', async () => {
    await render(<EmptyState title="Sin actividades este día" />);
    expect(screen.getByText('Sin actividades este día')).toBeTruthy();
  });

  it('muestra la descripcion cuando la hay', async () => {
    await render(<EmptyState title="Sin actividades" description="Toca + para agendar" />);
    expect(screen.getByText('Toca + para agendar')).toBeTruthy();
  });

  it('sin descripcion no pinta nada extra', async () => {
    await render(<EmptyState title="Sin actividades" />);
    expect(screen.queryByText('Toca + para agendar')).toBeNull();
  });
});

describe('ErrorState', () => {
  it('muestra el mensaje', async () => {
    await render(<ErrorState message="No se pudo cargar." />);
    expect(screen.getByText('No se pudo cargar.')).toBeTruthy();
  });

  it('se anuncia como alerta', async () => {
    await render(<ErrorState message="No se pudo cargar." />);
    expect(tieneRol('alert')).toBe(true);
  });

  it('ofrece reintentar cuando hay como', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState message="Falló." onRetry={onRetry} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sin onRetry no muestra el boton', async () => {
    await render(<ErrorState message="Falló." />);
    expect(screen.queryByText('Reintentar')).toBeNull();
  });
});

describe('Skeleton', () => {
  it('se renderiza sin contenido', async () => {
    const r = await render(<Skeleton />);
    expect(r.toJSON()).toBeTruthy();
  });

  it('acepta un estilo para imitar la forma del contenido', async () => {
    const r = await render(<Skeleton style={{ height: 48 }} />);
    expect(r.toJSON()).toBeTruthy();
  });
});
