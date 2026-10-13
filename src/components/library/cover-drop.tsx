import type { ReactNode } from 'react';

export type CoverDropProps = {
  children: ReactNode;
  /** Una imagen soltada o pegada, como dirección local. */
  onImage: (uri: string) => void;
};

/** En el teléfono no se arrastran archivos ni se pega con teclado: la hoja ofrece "Pegar imagen". */
export function CoverDrop({ children }: CoverDropProps) {
  return <>{children}</>;
}
