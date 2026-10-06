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

type Idioma = 'es' | 'en';

function fechaLarga(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Monterrey',
  }).format(new Date(iso));
}

/**
 * Textos del correo en los dos idiomas (spec 12, RF-I6). Viven aquí y no en `src/i18n` porque
 * esta función corre en el servidor de Vercel, fuera de la app.
 */
const TEXTOS = {
  es: {
    subject: (n: string) => `${n} te pide permiso para usar KAVI`,
    hello: 'Hola:',
    signedUp: (n: string) =>
      `${n} se registró en KAVI, una app para organizar su calendario, sus listas y sus entrenamientos. Nos dijo que tiene 16 o 17 años y que tú eres su madre, padre o tutor.`,
    law: 'La ley mexicana pide tu consentimiento para que KAVI trate sus datos personales, incluidos algunos que pueden revelar información de salud (como su peso corporal en el registro de gimnasio). KAVI no usa los datos para publicidad ni los vende.',
    reviewText: (enlace: string) => `Revisa el aviso de privacidad y decide aquí: ${enlace}`,
    review: 'Revisar y decidir',
    expires: (fecha: string) =>
      `El enlace vence el ${fecha}. Si no sabes de qué se trata, ignora este correo: sin tu aprobación la cuenta no se puede usar.`,
    other: 'Read this in English',
    otherText: (enlace: string) => `Read this in English: ${enlace}`,
  },
  en: {
    subject: (n: string) => `${n} is asking your permission to use KAVI`,
    hello: 'Hi,',
    signedUp: (n: string) =>
      `${n} signed up for KAVI, an app to organize their calendar, lists and workouts. They told us they are 16 or 17 and that you are their mother, father or guardian.`,
    law: 'Mexican law requires your consent for KAVI to process their personal data, including some that may reveal health information (such as their body weight in the gym log). KAVI doesn’t use the data for advertising or sell it.',
    reviewText: (enlace: string) => `Review the privacy notice and decide here: ${enlace}`,
    review: 'Review and decide',
    expires: (fecha: string) =>
      `The link expires on ${fecha}. If you don’t know what this is about, ignore this email: without your approval the account can’t be used.`,
    other: 'Leer en español',
    otherText: (enlace: string) => `Leer en español: ${enlace}`,
  },
} as const;

/**
 * El correo va en el idioma de la app del menor, que es lo único que KAVI sabe del hogar. El
 * botón "en el otro idioma" abre `/consentimiento` en ese idioma: un correo no puede mostrar y
 * esconder secciones de forma confiable (Gmail quita esos trucos), y la página tiene la misma
 * explicación y la decisión.
 */
function correo(nombre: string, token: string, expira: string, idioma: Idioma): { subject: string; text: string; html: string } {
  const x = TEXTOS[idioma];
  const otro: Idioma = idioma === 'en' ? 'es' : 'en';
  const enlace = `${SITIO}/consentimiento?token=${token}&lang=${idioma}`;
  const enlaceOtro = `${SITIO}/consentimiento?token=${token}&lang=${otro}`;
  const vence = fechaLarga(expira, idioma);
  const subject = x.subject(nombre);
  const text = [x.hello, '', x.signedUp(nombre), '', x.law, '', x.reviewText(enlace), '', x.expires(vence), '', x.otherText(enlaceOtro), '', 'KAVI'].join('\n');
  const n = escapar(nombre);
  const html = `<!doctype html><html lang="${idioma}"><body style="margin:0;padding:24px;background:#F2F2F2;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#131313">
<div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px">
<p style="font-size:24px;font-weight:700;margin:0 0 16px">KAVI</p>
<p style="font-size:16px;line-height:24px">${escapar(x.hello)}</p>
<p style="font-size:16px;line-height:24px">${escapar(x.signedUp(nombre)).replace(n, `<strong>${n}</strong>`)}</p>
<p style="font-size:16px;line-height:24px">${escapar(x.law)}</p>
<p style="margin:24px 0"><a href="${escapar(enlace)}" style="display:inline-block;background:#131313;color:#F2F2F2;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:12px">${escapar(x.review)}</a></p>
<p style="font-size:14px;line-height:20px;color:#565656">${escapar(x.expires(vence))}</p>
<p style="margin:24px 0 0"><a href="${escapar(enlaceOtro)}" lang="${otro}" style="display:inline-block;border:1px solid #D4D4D4;color:#131313;text-decoration:none;font-weight:600;font-size:14px;padding:10px 16px;border-radius:12px">${escapar(x.other)}</a></p>
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
  let idioma: Idioma = 'es';
  try {
    const body = (await request.json()) as { guardianEmail?: unknown; lang?: unknown };
    email = typeof body.guardianEmail === 'string' ? body.guardianEmail.trim().toLowerCase() : '';
    // Sin idioma o con uno desconocido, español (RF-I6).
    if (body.lang === 'en') idioma = 'en';
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

  const mensaje = correo(fila.minor_name, fila.token, fila.expires_at, idioma);
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
