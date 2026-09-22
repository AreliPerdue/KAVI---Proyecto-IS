/**
 * Globales de Jest (`describe`, `it`, `expect`, `jest`) para los archivos de
 * `__tests__`, que entran en el `include` de tsconfig y por tanto en
 * `pnpm typecheck`.
 *
 * Se referencian a mano: con la resolucion automatica de `@types` bajo pnpm,
 * `tsc` no los estaba recogiendo.
 */

/// <reference types="jest" />
