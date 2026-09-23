// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * El acceso a datos solo puede vivir en `src/services/`.
 *
 * Es la regla de arquitectura del proyecto (NFR-6) y hasta ahora dependía de que
 * quien escribiera código se acordara. Una pantalla que llame directamente a
 * Supabase se salta la traducción de errores, el doble del backend demo y el punto
 * donde se aplican las convenciones de consulta: funcionaría, y rompería las tres
 * cosas en silencio.
 */
const SOLO_EN_SERVICIOS = {
  paths: [
    {
      name: '@/lib/supabase',
      message:
        'El acceso a datos va en src/services/. Usa el servicio correspondiente, o crea uno nuevo si falta (NFR-6).',
    },
  ],
  patterns: [
    {
      group: ['@supabase/supabase-js'],
      importNamePattern: '^(?!type ).*',
      message:
        'Solo src/services/supabase/ habla con el cliente de Supabase. Desde fuera, importa únicamente tipos (NFR-6).',
    },
  ],
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/services/supabase/**', 'src/lib/supabase.ts'],
    rules: {
      'no-restricted-imports': ['error', SOLO_EN_SERVICIOS],
    },
  },
]);
