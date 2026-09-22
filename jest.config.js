/**
 * Jest con el preset de Expo (transforma TS/JSX y el runtime de React Native).
 *
 * Las pruebas cubren logica pura (`src/lib`) y el CRUD del backend demo
 * (`src/services/demo`), que es determinista y en memoria: no tocan red,
 * Supabase ni modulos nativos.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    // El orden importa: Jest usa la primera clave que casa.
    '\\.(css)$': '<rootDir>/__mocks__/style-mock.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  /*
   * Todo el codigo de la app, no solo lo que hoy tiene pruebas: Sonar mide la
   * cobertura sobre todo `src/` y cuenta como 0 % lo que no aparece en el lcov.
   * Acotarlo aqui daria un numero local mas alto que el del panel y seria
   * enganoso al documentarlo (rubrica: fase 2).
   */
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/types/**',
    '!src/**/*.d.ts',
  ],
};
