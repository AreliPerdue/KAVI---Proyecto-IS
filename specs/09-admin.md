# Spec 09 — Modo administrador (F7)

## Objetivo
Que quien opera KAVI pueda ver **cómo va el producto** (cuántas cuentas hay, cuánto se usa)
sin salir de la app y sin abrir la consola de Supabase.

## Principio rector (P4 — privacidad)
El modo admin da **números agregados, nunca contenido**. Una cuenta administradora no
ve actividades, títulos, contactos ni entrenamientos de nadie: sus políticas RLS son las
mismas que las de cualquier usuario. Lo único que gana es el permiso de ejecutar dos
funciones que devuelven conteos. Esto es deliberado: un panel que dejara leer agendas
ajenas convertiría un rol operativo en una puerta trasera.

## El rol
- Un único rol especial: **`adminkavi`**, guardado en `profiles.role` (`'user' | 'adminkavi'`).
- **El rol no se puede cambiar desde la app.** Un trigger lo bloquea en cuanto detecta que
  la petición viene de una sesión de usuario. Se concede ejecutando SQL en el proyecto:

  ```sql
  update public.profiles set role = 'adminkavi'
   where id = (select id from auth.users where email = 'correo@ejemplo.com');
  ```

- No hay pantalla para nombrar administradores. Es intencional: el alta de un rol con
  visibilidad sobre el negocio es una decisión de quien administra el proyecto, no una
  función del producto.

## Requerimientos funcionales
- RF-AD1. **Se entra por el login normal.** No hay pantalla de acceso aparte ni credencial
  distinta: quien administra usa su cuenta de siempre. Al abrir sesión, la app lee su perfil
  y, si `role = 'adminkavi'`, desbloquea el panel.
- RF-AD2. Una cuenta administradora **sigue siendo una cuenta normal**: tiene su calendario,
  sus contactos y sus temas. El modo admin es una sección añadida, no un modo aparte que
  sustituya la app.
- RF-AD3. El acceso al panel aparece en **Perfil**, en un grupo "Administración" que solo
  existe para esa cuenta. No es una quinta pestaña: la barra se queda en cuatro
  (`kavi-design` §3).
- RF-AD4. El panel muestra, en tarjetas: cuentas registradas, altas de 7 y 30 días, cuentas
  activas en 30 días, actividades totales y de 30 días, conexiones aceptadas, calendarios
  compartidos, temas propios creados y entrenamientos registrados.
- RF-AD5. El panel lista las cuentas registradas con correo, nombre, rol, fecha de alta,
  número de actividades y última señal de actividad. Es la respuesta a "cuántas cuentas hay
  y quiénes son". Nunca incluye contenido de sus agendas.
- RF-AD6. Si una cuenta sin rol llama a las funciones del panel, el backend responde con
  error de permisos. La comprobación vive en la base de datos, no en la app: esconder el
  botón no es un control de acceso.
- RF-AD7. Estados obligatorios (NFR-11): carga con skeleton, error con "Reintentar",
  y aviso si no hay conexión.

## Criterios de aceptación
- *Dado* un usuario con `role='user'`, *cuando* abre Perfil, *entonces* no existe el grupo
  "Administración"; *y cuando* llama a `admin_stats()` directamente, *entonces* recibe error
  de permisos.
- *Dado* un usuario con `role='user'`, *cuando* intenta `update profiles set role='adminkavi'`,
  *entonces* la base lo rechaza.
- *Dado* un usuario con `role='adminkavi'`, *cuando* abre el panel, *entonces* ve el total de
  cuentas registradas y el listado con sus correos.
- *Dado* un usuario con `role='adminkavi'`, *cuando* consulta actividades de otra persona sin
  share, *entonces* sigue recibiendo 0 filas.

## Implementación
| Pieza | Dónde |
|---|---|
| Columna `profiles.role` + trigger `protect_profile_role` | `supabase/migrations/20260919000800_admin.sql` |
| `is_admin(uuid)` | idem |
| `admin_stats()` → conteos agregados | idem |
| `admin_accounts(limit, offset)` → listado con correo | idem |
| Contrato `AdminApi` | `src/services/contracts.ts` |
| Pantalla | `src/app/(app)/admin.tsx` |

Las pruebas de los cuatro criterios están en `supabase/tests/rls.sql` (bloques 9 y 10).
