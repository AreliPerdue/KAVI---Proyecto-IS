/** El encabezado de la librería (spec 13a, RF-BL22): "Atrás" apilada; en la barra del teléfono, no (T302). */
import { render, screen } from '@testing-library/react-native';

import { LibraryHeader } from '@/components/library/library-header';
import { ModuleInBarContext } from '@/components/navigation/stacked-module';

jest.mock('@/hooks/use-profile', () => ({ useMyProfile: () => ({ data: { display_name: 'Areli Perdue' } }) }));

it('apilada lleva "Atrás" y el saludo', async () => {
  await render(<LibraryHeader />);
  expect(screen.getByRole('button', { name: 'Atrás' })).toBeTruthy();
  expect(screen.getByText(/Areli/)).toBeTruthy();
});

it('en la barra no lleva "Atrás": es una pestaña', async () => {
  await render(
    <ModuleInBarContext value>
      <LibraryHeader />
    </ModuleInBarContext>,
  );
  expect(screen.queryByRole('button', { name: 'Atrás' })).toBeNull();
});
