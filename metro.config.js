/**
 * Metro con la configuración de Expo y dos ajustes.
 *
 * `pdf-lib` (KAVI Library, T278) trae `tslib` 1, cuyo `exports` manda a Metro, por la condición
 * `import`, a `modules/index.js`: un envoltorio que hace `import tslib from '../tslib.js'` sobre
 * un archivo UMD. Metro no le da un `default` y la app entera se caía al cargar con
 * "Cannot destructure property '__extends' of 'tslib.default'". Se resuelve siempre a
 * `tslib.es6.js`, que exporta las funciones directamente y existe en `tslib` 1 y 2.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const resolverBase = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const nombre = moduleName === 'tslib' ? 'tslib/tslib.es6.js' : moduleName;
  return (resolverBase ?? context.resolveRequest)(context, nombre, platform);
};

// El motor de lectura empaquetado para el teléfono (T285) viaja como un archivo más de la app.
config.resolver.assetExts = [...config.resolver.assetExts, 'html'];

module.exports = config;
