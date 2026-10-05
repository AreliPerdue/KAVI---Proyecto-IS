/** Navegación: pestañas, módulos y Más (spec 01, RF-N1–N6). */
export const nav = {
  calendar: 'Calendario',
  modules: { shared: 'Compartido', lists: 'Listas', fitness: 'Fitness', profile: 'Perfil' },
  more: 'Más',
  modulesSection: 'Módulos',
  inBar: 'En la barra',
  barSection: 'Barra',
  barFooter: 'El Calendario siempre va primero y Más siempre al final. Si eliges un módulo que ya está en el otro lugar, se intercambian.',
  secondPlace: 'Segundo lugar',
  thirdPlace: 'Tercer lugar',
  swaps: 'Está en el otro lugar: se intercambian',
  swapsA11y: (modulo: string) => `${modulo}, está en el otro lugar; se intercambian`,
};
