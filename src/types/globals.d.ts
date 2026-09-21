/**
 * Tipos globales de Expo (módulos `*.css`, `*.png`, react-native-web…).
 *
 * Expo genera `expo-env.d.ts` en la raíz con esta misma referencia, pero ese
 * archivo está en `.gitignore` por indicación del propio Expo, así que en CI
 * (checkout limpio, sin correr la CLI) no existe y `import '@/global.css'`
 * fallaba con TS2882. Esta copia versionada garantiza el mismo tipado.
 */

/// <reference types="expo/types" />
