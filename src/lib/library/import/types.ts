/** Lo que KAVI saca de un archivo al importarlo, antes de que la persona lo corrija (RF-BL12). */
export type DatosLibro = {
  title?: string;
  authors: string[];
  genres: string[];
  /** Solo en PDF; un EPUB se reacomoda y no tiene páginas fijas. */
  pageCount: number | null;
  /** La imagen de portada, si el archivo la trae. */
  cover: { bytes: Uint8Array; mime: string; ext: string } | null;
  /** La saga y el número, si el EPUB los trae (RF-BL24). */
  serie?: { nombre: string; numero: number | null } | null;
};

/** Un archivo elegido para importar, ya leído. */
export type ArchivoElegido = { name: string; mime: string; bytes: Uint8Array };

export type FormatoLibro = 'pdf' | 'epub';
