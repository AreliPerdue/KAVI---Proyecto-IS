/**
 * Constantes del modo demo compartidas entre la UI y el backend en memoria.
 * Viven aquí y no en `services/demo/` para que las pantallas no importen esa capa.
 */

/** En demo no sale ningún correo: el código de verificación es fijo y se muestra en pantalla. */
export const DEMO_OTP = '123456';
