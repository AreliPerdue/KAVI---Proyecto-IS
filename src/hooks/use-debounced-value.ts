import { useEffect, useState } from 'react';

/**
 * Retrasa el valor hasta que deje de cambiar `delay` ms.
 *
 * Sin esto cada tecla dispara su propia consulta: nueve peticiones para escribir
 * "ana_torres", y las respuestas pueden llegar desordenadas y pintar un resultado
 * viejo sobre uno nuevo.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
