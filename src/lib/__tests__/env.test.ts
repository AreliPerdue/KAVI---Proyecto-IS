/**
 * Resolucion del modo demo (NFR-5).
 *
 * Esta logica decide si la app habla con Supabase o con el backend en memoria,
 * y lo hace en silencio: sin credenciales cae a demo sin avisar. Ese
 * comportamiento provoco que un APK de produccion saliera en modo demo cuando
 * el perfil de EAS no cargaba las variables, asi que conviene tenerlo fijado.
 *
 * `env` se calcula al importar el modulo, por eso cada caso recarga con
 * `resetModules` tras ajustar `process.env`.
 */
const URL_REAL = 'https://evoroilcnsaciusotnqh.supabase.co';
const KEY_REAL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.carga-util-suficientemente-larga';

function loadEnv(vars: Record<string, string | undefined>) {
  jest.resetModules();
  for (const key of ['EXPO_PUBLIC_DEMO_MODE', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']) {
    delete process.env[key];
  }
  Object.assign(process.env, vars);
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- el modulo lee process.env al cargarse */
  return (require('@/lib/env') as typeof import('@/lib/env')).env;
}

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('con credenciales completas', () => {
  it('usa el backend real', () => {
    const env = loadEnv({
      EXPO_PUBLIC_DEMO_MODE: 'false',
      EXPO_PUBLIC_SUPABASE_URL: URL_REAL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: KEY_REAL,
    });

    expect(env.isDemoMode).toBe(false);
    expect(env.supabaseUrl).toBe(URL_REAL);
  });

  it('la bandera explicita gana sobre las credenciales', () => {
    const env = loadEnv({
      EXPO_PUBLIC_DEMO_MODE: 'true',
      EXPO_PUBLIC_SUPABASE_URL: URL_REAL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: KEY_REAL,
    });

    expect(env.isDemoMode).toBe(true);
  });
});

describe('cae a modo demo', () => {
  it('sin ninguna variable', () => {
    expect(loadEnv({}).isDemoMode).toBe(true);
  });

  it('sin la URL, aunque haya llave (el caso del APK de produccion)', () => {
    expect(loadEnv({ EXPO_PUBLIC_DEMO_MODE: 'false', EXPO_PUBLIC_SUPABASE_ANON_KEY: KEY_REAL }).isDemoMode).toBe(true);
  });

  it('sin la llave, aunque haya URL', () => {
    expect(loadEnv({ EXPO_PUBLIC_DEMO_MODE: 'false', EXPO_PUBLIC_SUPABASE_URL: URL_REAL }).isDemoMode).toBe(true);
  });

  it('con la URL de ejemplo de .env.example sin sustituir', () => {
    const env = loadEnv({
      EXPO_PUBLIC_DEMO_MODE: 'false',
      EXPO_PUBLIC_SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: KEY_REAL,
    });

    expect(env.isDemoMode).toBe(true);
  });

  it('con una llave demasiado corta para ser un JWT', () => {
    const env = loadEnv({
      EXPO_PUBLIC_DEMO_MODE: 'false',
      EXPO_PUBLIC_SUPABASE_URL: URL_REAL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'corta',
    });

    expect(env.isDemoMode).toBe(true);
  });

  it('con una URL que no es http', () => {
    const env = loadEnv({
      EXPO_PUBLIC_DEMO_MODE: 'false',
      EXPO_PUBLIC_SUPABASE_URL: 'evoroilcnsaciusotnqh.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: KEY_REAL,
    });

    expect(env.isDemoMode).toBe(true);
  });
});

describe('la bandera solo activa demo con el texto exacto "true"', () => {
  it.each(['TRUE', 'True', '1', 'si', ''])('no lo activa con %p', (value) => {
    const env = loadEnv({
      EXPO_PUBLIC_DEMO_MODE: value,
      EXPO_PUBLIC_SUPABASE_URL: URL_REAL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: KEY_REAL,
    });

    expect(env.isDemoMode).toBe(false);
  });
});
