/**
 * Jest con el preset de Expo (transforma TS/JSX y el runtime de React Native).
 *
 * Las pruebas cubren logica pura (`src/lib`) y el CRUD del backend demo
 * (`src/services/demo`), que es determinista y en memoria: no tocan red,
 * Supabase ni modulos nativos.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    // El orden importa: Jest usa la primera clave que casa.
    '\\.(css)$': '<rootDir>/__mocks__/style-mock.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/lib/**/*.ts', 'src/services/demo/**/*.ts'],
};
