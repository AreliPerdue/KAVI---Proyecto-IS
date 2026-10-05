/**
 * Función de Vercel: correo de aprobación a la madre, padre o tutor (RF-A13).
 *
 * Por qué vive aquí y no en Supabase: las Edge Functions de Supabase no pueden abrir los
 * puertos SMTP, y el correo de KAVI sale por Gmail. Aquí sí.
 *
 * Flujo:
 * 1. La app llama con la sesión del menor (`Authorization: Bearer <jwt>`) y el correo del adulto.
 * 2. Esta función llama a `create_guardian_consent` **con esa misma sesión** y con el secreto
 *    del servidor (`KAVI_EMAIL_SECRET`). La base comprueba el secreto contra su SHA-256, la
 *    edad (16 o 17), que no sea el correo propio y el límite de 5 al día, y devuelve el token.
 * 3. El token solo existe en esta función y en el correo: la base guarda su SHA-256 y la app
 *    del menor nunca lo ve, así que no puede aprobarse a sí misma.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables; nunca en el repo):
 * `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `KAVI_EMAIL_SECRET`,
 * `SMTP_USER`, `SMTP_PASSWORD`.
 */
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

/** Fijo y no tomado del `Host` de la petición, para que nadie pueda hacer que el enlace apunte a otro sitio. */
const SITIO = 'https://kavi-proyecto-is.vercel.app';
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Fila = { token: string; minor_name: string; expires_at: string };

function responder(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Monterrey' }).format(
    new Date(iso),
  );
}

function correo(nombre: string, enlace: string, vence: string): { subject: string; text: string; html: string } {
  const subject = `${nombre} te pide permiso para usar KAVI`;
  const text = [
    'Hola:',
    '',
    `${nombre} se registró en KAVI, una app para organizar su calendario, sus listas y sus entrenamientos. Nos dijo que tiene 16 o 17 años y que tú eres su madre, padre o tutor.`,
    '',
    'La ley mexicana pide tu consentimiento para que KAVI trate sus datos personales, incluidos algunos que pueden revelar información de salud (como su peso corporal en el registro de gimnasio). KAVI no usa los datos para publicidad ni los vende.',
    '',
    `Revisa el aviso de privacidad y decide aquí: ${enlace}`,
    '',
    `El enlace vence el ${vence}. Si no sabes de qué se trata, ignora este correo: sin tu aprobación la cuenta no se puede usar.`,
    '',
    'KAVI',
  ].join('\n');
  const n = escapar(nombre);
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#F2F2F2;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#131313">
<div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px">
<p style="font-size:24px;font-weight:700;margin:0 0 16px">KAVI</p>
<p style="font-size:16px;line-height:24px">Hola:</p>
<p style="font-size:16px;line-height:24px"><strong>${n}</strong> se registró en KAVI, una app para organizar su calendario, sus listas y sus entrenamientos. Nos dijo que tiene 16 o 17 años y que tú eres su madre, padre o tutor.</p>
<p style="font-size:16px;line-height:24px">La ley mexicana pide tu consentimiento para que KAVI trate sus datos personales, incluidos algunos que pueden revelar información de salud (como su peso corporal en el registro de gimnasio). KAVI no usa los datos para publicidad ni los vende.</p>
<p style="margin:24px 0"><a href="${escapar(enlace)}" style="display:inline-block;background:#131313;color:#F2F2F2;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:12px">Revisar y decidir</a></p>
<p style="font-size:14px;line-height:20px;color:#565656">El enlace vence el ${escapar(vence)}. Si no sabes de qué se trata, ignora este correo: sin tu aprobación la cuenta no se puede usar.</p>
</div></body></html>`;
  return { subject, text, html };
}

export async function POST(request: Request): Promise<Response> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const secreto = process.env.KAVI_EMAIL_SECRET;
  const usuario = process.env.SMTP_USER;
  const clave = process.env.SMTP_PASSWORD;
  if (!url || !anon || !secreto || !usuario || !clave) {
    return responder(503, { error: 'El envío de correos no está disponible. Inténtalo más tarde.' });
  }

  const jwt = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!jwt) return responder(401, { error: 'Necesitas iniciar sesión.' });

  let email = '';
  try {
    const body = (await request.json()) as { guardianEmail?: unknown };
    email = typeof body.guardianEmail === 'string' ? body.guardianEmail.trim().toLowerCase() : '';
  } catch {
    // cuerpo inválido: cae en la validación de abajo
  }
  if (!CORREO.test(email) || email.length > 254) {
    return responder(400, { error: 'Escribe un correo válido.' });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc('create_guardian_consent', { p_secret: secreto, p_guardian_email: email });
  if (error) {
    // 22023: mensajes ya pensados para la persona (edad, correo propio, límite diario).
    if (error.code === '22023') return responder(400, { error: error.message });
    if (error.code === '42501') return responder(401, { error: 'Necesitas iniciar sesión.' });
    console.error('[guardian-consent] rpc', error.code, error.message);
    return responder(500, { error: 'No se pudo enviar el correo. Inténtalo más tarde.' });
  }
  const fila = (data as Fila[] | null)?.[0];
  if (!fila) return responder(500, { error: 'No se pudo enviar el correo. Inténtalo más tarde.' });

  const enlace = `${SITIO}/consentimiento?token=${fila.token}`;
  const mensaje = correo(fila.minor_name, enlace, fechaLarga(fila.expires_at));
  try {
    const transporte = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: usuario, pass: clave },
    });
    await transporte.sendMail({ from: `"KAVI" <${usuario}>`, to: email, ...mensaje });
  } catch (e) {
    console.error('[guardian-consent] smtp', e instanceof Error ? e.message : e);
    return responder(502, { error: 'No se pudo enviar el correo. Revisa la dirección e inténtalo de nuevo.' });
  }
  return responder(200, { ok: true, expiresAt: fila.expires_at });
}
