/**
 * Función de Vercel que manda el correo al adulto (RF-A13, RF-I6). Se prueba sin red: Supabase y
 * el envío de correo están simulados, así que nada sale de esta máquina.
 */
const mockRpc = jest.fn();
const mockEnviar = jest.fn();
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc: (...a: unknown[]) => mockRpc(...a) }) }));
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: () => ({ sendMail: (...a: unknown[]) => mockEnviar(...a) }) } }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const { POST } = require('../../../api/guardian-consent') as typeof import('../../../api/guardian-consent');

const ENV = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  KAVI_EMAIL_SECRET: 'secreto-de-prueba',
  SMTP_USER: 'kavi@example.com',
  SMTP_PASSWORD: 'clave-de-prueba',
};

const pedir = (body: unknown, jwt: string | null = 'jwt-del-menor') =>
  POST(
    new Request('https://kavi.test/api/guardian-consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  Object.assign(process.env, ENV);
  mockRpc.mockReset();
  mockEnviar.mockReset();
  mockRpc.mockResolvedValue({ data: [{ token: 'TOKEN123', minor_name: 'Pau', expires_at: '2026-10-14T18:00:00Z' }], error: null });
  mockEnviar.mockResolvedValue({});
});

afterAll(() => {
  for (const k of Object.keys(ENV)) delete process.env[k];
});

describe('api/guardian-consent', () => {
  it('sin variables de entorno responde 503 y no manda nada', async () => {
    delete process.env.SMTP_PASSWORD;
    const r = await pedir({ guardianEmail: 'mama@x.com' });
    expect(r.status).toBe(503);
    expect(mockEnviar).not.toHaveBeenCalled();
  });

  it('sin sesión, 401', async () => {
    expect((await pedir({ guardianEmail: 'mama@x.com' }, null)).status).toBe(401);
  });

  it('correo inválido, 400 sin tocar la base', async () => {
    const r = await pedir({ guardianEmail: 'no-es-correo' });
    expect(r.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('los mensajes de la base pensados para la persona (22023) pasan tal cual', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'Ya enviaste varios correos hoy. Inténtalo mañana.' } });
    const r = await pedir({ guardianEmail: 'mama@x.com' });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'Ya enviaste varios correos hoy. Inténtalo mañana.' });
  });

  it('pasa el secreto del servidor a la base, nunca lo devuelve', async () => {
    const r = await pedir({ guardianEmail: ' Mama@X.com ' });
    expect(mockRpc).toHaveBeenCalledWith('create_guardian_consent', { p_secret: 'secreto-de-prueba', p_guardian_email: 'mama@x.com' });
    expect(JSON.stringify(await r.json())).not.toContain('secreto');
  });

  it('en el idioma de la app del menor, con el botón al otro idioma (RF-I6)', async () => {
    await pedir({ guardianEmail: 'mama@x.com', lang: 'en' });
    const correo = mockEnviar.mock.calls[0][0] as { to: string; subject: string; html: string; text: string };
    expect(correo.to).toBe('mama@x.com');
    expect(correo.subject).toBe('Pau is asking your permission to use KAVI');
    expect(correo.text).toContain('consentimiento?token=TOKEN123&lang=en');
    expect(correo.text).toContain('Leer en español: https://kavi-proyecto-is.vercel.app/consentimiento?token=TOKEN123&lang=es');
  });

  it('sin idioma, o con uno desconocido, en español', async () => {
    await pedir({ guardianEmail: 'mama@x.com', lang: 'fr' });
    const correo = mockEnviar.mock.calls[0][0] as { subject: string; html: string };
    expect(correo.subject).toBe('Pau te pide permiso para usar KAVI');
    expect(correo.html).toContain('<html lang="es">');
  });

  it('el nombre del menor se escapa en el HTML', async () => {
    mockRpc.mockResolvedValue({ data: [{ token: 'T', minor_name: '<b>Pau</b>', expires_at: '2026-10-14T18:00:00Z' }], error: null });
    await pedir({ guardianEmail: 'mama@x.com' });
    expect((mockEnviar.mock.calls[0][0] as { html: string }).html).not.toContain('<b>Pau</b>');
  });

  it('si el correo no sale, 502 con un mensaje para la persona', async () => {
    const silencio = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockEnviar.mockRejectedValue(new Error('SMTP caído'));
    const r = await pedir({ guardianEmail: 'mama@x.com' });
    expect(r.status).toBe(502);
    expect((await r.json()).error).not.toContain('SMTP');
    silencio.mockRestore();
  });
});
