/** KAVI Library (spec 13). Biblioteca en español (decisión B8). */
export const library = {
  title: 'Biblioteca',
  inDevelopment: 'En desarrollo',
  devHint: 'Library se está construyendo por etapas. Lo que ves aquí cambia seguido y todavía no está en Más ni en la barra.',
  emptyTitle: 'Tu biblioteca está vacía',
  emptyDescription: 'Pronto podrás traer tus PDF y EPUB, leerlos como un libro de verdad y anotarlos.',
  usage: (usado: string, tope: string) => `${usado} de ${tope}`,
  usageA11y: (usado: string, tope: string, porcentaje: number) => `Espacio usado: ${usado} de ${tope}, ${porcentaje} %`,
  usageAlmostFull: 'Tu biblioteca está casi llena.',
  profileSection: 'En desarrollo',
  profileRow: 'Biblioteca',
  profileHint: 'Lo nuevo de KAVI mientras se construye. Solo para ti y tus testers.',
  pieces: (n: number) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`,
};
