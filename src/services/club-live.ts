/** Sesión en vivo de un club de lectura (13f, T309). Fachada sobre el backend activo. */
import { clubLiveApi } from '@/services/backend';

export const entrarEnVivo = clubLiveApi.entrar;
export const avisarEnVivo = clubLiveApi.avisar;
export const escucharAvisosEnVivo = clubLiveApi.escucharAvisos;
