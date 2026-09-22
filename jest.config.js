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
  /*
   * La cobertura se emite a `reports/pruebas/cobertura`, que SI se versiona:
   * la entrega pide los reportes dentro del repositorio, no solo que las
   * pruebas corran. `lcov` alimenta a SonarQube, `html` es el navegable y
   * `json-summary` el que se resume en el README.
   */
  coverageDirectory: 'reports/pruebas/cobertura',
  // Sin 'html': el reportero `lcov` ya emite el informe navegable en
  // `lcov-report/`, y tenerlos los dos duplicaba 350 ficheros en el repo.
  coverageReporters: ['lcov', 'json-summary', 'text-summary'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/types/**',
    '!src/**/*.d.ts',
  ],
  /**
   * Suelo de cobertura. Se fija por debajo de lo que hay hoy (83 % de sentencias,
   * 85 % de lineas, 78 % de ramas y funciones) para que un refactor normal no lo
   * rompa, pero si lo rompa una perdida real de pruebas. Solo aplica cuando se
   * mide cobertura, asi que `pnpm test` a secas no se ve afectado.
   */
  coverageThreshold: {
    global: { statements: 80, lines: 80, branches: 74, functions: 74 },
  },
};
