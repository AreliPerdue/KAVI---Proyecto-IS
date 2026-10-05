/**
 * Aviso de privacidad de KAVI (T260), fuente única del texto que se publica en `/privacidad`.
 *
 * `PRIVACY_VERSION` es lo que cada cuenta acepta en "Antes de empezar" (RF-A13): si el texto
 * cambia en algo importante, se sube la versión y a todas se les vuelve a pedir la aceptación.
 * Una corrección de erratas no cambia la versión.
 *
 * En los párrafos, `**así**` va en negritas.
 */
export const PRIVACY_VERSION = 'v1-2026-10-05';
export const PRIVACY_UPDATED = '5 de octubre de 2026';
export const PRIVACY_CONTACT = 'perdue.areli28@gmail.com';
export const SITE_URL = 'https://kavi-proyecto-is.vercel.app';

export type PrivacyBlock = string | { list: readonly string[] };
export type PrivacySection = { title: string; blocks: readonly PrivacyBlock[] };

export const PRIVACY_INTRO =
  'En KAVI nos tomamos en serio tus datos. Este aviso explica, en lenguaje claro, qué datos usamos, para qué, con quién se comparten y cómo puedes controlarlos. Se emite conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (2025).';

export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  {
    title: '1. Quién es responsable de tus datos',
    blocks: [
      'Areli Soraya Perdue Centeno, con domicilio para oír y recibir notificaciones en Avenida Del Pedregal 534, colonia Pedregal del Valle, C. P. 66280, San Pedro Garza García, Nuevo León, México, es responsable del tratamiento de tus datos personales en KAVI.',
      `Para cualquier tema de privacidad escríbenos a **${PRIVACY_CONTACT}**.`,
    ],
  },
  {
    title: '2. Qué datos usamos',
    blocks: [
      '**Para tu cuenta:** correo electrónico, nombre de usuario, nombre y contraseña. La contraseña se guarda cifrada por nuestro proveedor de autenticación; nadie de KAVI puede verla.',
      '**Para comprobar tu edad:** tu fecha de nacimiento y la fecha en que aceptaste este aviso. Solo tú la ves; tus contactos no. Si tienes 16 o 17 años, también el correo de tu madre, padre o tutor y su respuesta.',
      '**Para tu perfil (opcionales):** tu Nobi o avatar y tu fecha de cumpleaños.',
      '**Para tu calendario y tus listas:** las actividades que agendas (título, fecha, hora, tema, descripción), tus temas, recordatorios, listas, pendientes y notas.',
      '**Para compartir:** tus contactos dentro de KAVI, con quién compartes tu calendario, actividades o listas, las invitaciones que envías y recibes, y los colores que asignas a cada contacto.',
      '**Para tus entrenamientos (datos de bienestar):** sesiones, ejercicios, series, pesos y repeticiones, y lo que decidas anotar: peso corporal, nivel de energía, notas y etiquetas (por ejemplo "Dolor"), y tu racha de entrenamiento con sus notas.',
      '**Actividad del teléfono, solo si la conectas:** pasos, distancia, calorías activas y entrenamientos de otras apps, que tu teléfono o reloj ya miden. **Estos datos no salen de tu dispositivo:** KAVI los lee ahí para mostrártelos y no los recibe en sus servidores.',
      '**Datos técnicos:** tus ajustes de la app (por ejemplo, la unidad de peso o el formato de hora) se guardan en tu propio dispositivo. Nuestros proveedores pueden registrar datos técnicos de las conexiones, como la dirección IP y la fecha, por seguridad y para que el servicio funcione.',
      '**Lo que no hacemos:** no usamos tus datos para publicidad, no vendemos datos, no usamos herramientas de analítica ni de rastreo de terceros, y no te enviamos mercadotecnia.',
    ],
  },
  {
    title: 'Datos personales sensibles',
    blocks: [
      'Algunos datos de entrenamiento, como el peso corporal o una nota de dolor, y la actividad del teléfono pueden revelar información sobre tu salud. La ley los considera **datos personales sensibles**. Solo los tratamos para mostrártelos y hacer los cálculos que ves en la app, y **solo con tu consentimiento expreso**: te lo pedimos la primera vez que entras a KAVI, en la pantalla "Antes de empezar", y para la actividad del teléfono, otra vez al conectarla.',
    ],
  },
  {
    title: '3. Para qué usamos tus datos',
    blocks: [
      'Únicamente para darte el servicio de KAVI:',
      {
        list: [
          'Crear y proteger tu cuenta, e iniciar sesión.',
          'Comprobar la edad mínima y, si tienes 16 o 17 años, pedir la aprobación de tu madre, padre o tutor.',
          'Guardar y sincronizar tu calendario, listas y entrenamientos entre tus dispositivos.',
          'Compartir con las personas que tú eliges lo que tú decides compartir.',
          'Programar tus recordatorios.',
          'Calcular lo que ves en la app: volumen, récords, peso máximo estimado, racha y logros.',
          'Mantener la seguridad del servicio y atender tus solicitudes.',
        ],
      },
      'No usamos tus datos para ninguna otra finalidad. Si algún día quisiéramos hacerlo, te pediríamos permiso antes.',
    ],
  },
  {
    title: '4. Con quién se comparten',
    blocks: [
      '**Con las personas que tú eliges.** Si compartes tu calendario, una actividad o una lista, esas personas ven lo que compartes, con el nivel de detalle que elijas. Tus entrenamientos son privados y no se comparten con nadie.',
      '**Con proveedores que nos ayudan a operar KAVI**, que solo pueden usar los datos para darnos su servicio:',
      {
        list: [
          '**Supabase:** base de datos y autenticación. Los datos se guardan en servidores en Estados Unidos.',
          '**Vercel:** aloja la versión web de KAVI y envía el correo de aprobación a madres, padres o tutores, en Estados Unidos.',
          '**Google (Gmail):** envía los correos de verificación de tu cuenta y el de aprobación a tu madre, padre o tutor.',
        ],
      },
      'No transferimos tus datos a otras personas ni empresas fuera de estos casos, salvo cuando una autoridad competente lo requiera conforme a la ley.',
    ],
  },
  {
    title: '5. Tus derechos y cómo ejercerlos',
    blocks: [
      'Puedes **acceder** a tus datos, **rectificarlos**, **cancelarlos** u **oponerte** a su tratamiento (derechos ARCO), y **revocar tu consentimiento**.',
      {
        list: [
          `Mucho lo puedes hacer directo en la app: editar tu perfil, borrar actividades, listas o entrenamientos, desconectar la actividad del teléfono (Perfil → Gimnasio → Datos de salud) y eliminar tu cuenta con todos tus datos (Perfil → Eliminar cuenta). Si ya no tienes acceso a la app, en ${SITE_URL}/eliminar-cuenta explicamos cómo pedirlo.`,
          `Para todo lo demás, escribe a **${PRIVACY_CONTACT}** con tu nombre de usuario, qué derecho quieres ejercer y sobre qué datos. Te responderemos en los plazos que marca la ley.`,
        ],
      },
    ],
  },
  {
    title: '6. Cuánto tiempo los guardamos',
    blocks: [
      'Mientras tengas tu cuenta. Si eliminas tu cuenta, tus datos se borran de la base de datos de inmediato, incluidas tu fecha de nacimiento y las solicitudes a tu madre, padre o tutor. Hoy KAVI no tiene copias de seguridad programadas; si algún día se activan, este aviso dirá cuánto tiempo se conservan. La actividad del teléfono nunca se guarda en nuestros servidores.',
    ],
  },
  {
    title: '7. Cómo los protegemos',
    blocks: [
      'Las conexiones van cifradas (HTTPS); las contraseñas se guardan cifradas; y la base de datos aplica reglas que hacen que cada persona solo pueda ver lo suyo y lo que otras personas le compartieron.',
    ],
  },
  {
    title: '8. Menores de edad',
    blocks: [
      'KAVI está pensada para personas de **16 años o más**, como estudiantes de universidad. Si tienes 16 o 17 años, la ley te considera menor de edad: para usar KAVI necesitas el **consentimiento de tu madre, padre o tutor**. Al empezar te pedimos su correo y le enviamos un enlace donde revisa este aviso y lo aprueba o no; hasta que lo apruebe, la cuenta no se puede usar. Tu madre, padre o tutor puede ejercer tus derechos ARCO escribiendo al correo de contacto.',
      'Si tienes menos de 16 años, no uses KAVI ni nos envíes datos personales. Si al empezar la fecha de nacimiento indica menos de 16 años, la cuenta se elimina en ese momento; si nos enteramos de otra forma de que una cuenta pertenece a alguien menor de 16, la eliminaremos.',
    ],
  },
  {
    title: '9. Cambios a este aviso',
    blocks: [
      'Publicaremos cualquier cambio en esta página con su fecha. Si el cambio es importante, te pediremos dentro de la app que vuelvas a aceptarlo.',
    ],
  },
  {
    title: '10. Autoridad',
    blocks: [
      'Si consideras que tu derecho a la protección de datos personales ha sido vulnerado, puedes acudir ante la autoridad competente, que conforme a la ley de 2025 es la Secretaría Anticorrupción y Buen Gobierno.',
    ],
  },
];
