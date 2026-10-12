import { formatNumber, getLanguage, type Language } from '@/i18n';

/**
 * Nombre de archivo seguro para una ruta de Storage (spec 13 §6): sin acentos, sin barras ni
 * caracteres raros. La ruta es `<uid>/<pieza>/<nombre>`; una barra en el nombre la rompería.
 * El nombre y la extensión se limpian por separado para no dejar restos como "ed.-.pdf".
 */
export function nombreSeguro(nombre: string): string {
  const coincide = /^(.*?)(\.[A-Za-z0-9]{1,8})?$/.exec(nombre.trim());
  const base = coincide?.[1] ?? nombre;
  const extension = (coincide?.[2] ?? '').toLowerCase();
  const limpio = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${limpio || 'archivo'}${extension}`;
}

/** "850 KB", "12.4 MB", "500 MB": el tamaño como lo diría una persona. */
export function formatBytes(bytes: number, lang: Language = getLanguage()): string {
  const kb = bytes / 1024;
  if (kb < 1024) return `${formatNumber(Math.max(0, Math.round(kb)), lang)} KB`;
  const mb = kb / 1024;
  return `${formatNumber(mb < 10 ? Math.round(mb * 10) / 10 : Math.round(mb), lang)} MB`;
}
