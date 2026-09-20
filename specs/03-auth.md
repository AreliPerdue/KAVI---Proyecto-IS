# Spec 03 — Autenticación y perfil (F1)

## Objetivo
Registro, inicio de sesión y sesión persistente con Supabase Auth (email + contraseña), y perfil básico editable.

## Historias de usuario
- HU-A1: Yo como persona usuaria, quiero registrarme con correo y contraseña para tener mi calendario personal.
- HU-A2: Yo como persona usuaria, quiero iniciar sesión y que la sesión persista para no autenticarme cada vez.
- HU-A3: Yo como persona usuaria, quiero editar mi nombre visible y username para que mis contactos me identifiquen.
- HU-A4: Yo como persona usuaria, quiero cerrar sesión para proteger mi cuenta en dispositivos compartidos.

## Requerimientos funcionales
- RF-A1. Registro con email y contraseña (mín. 8 caracteres). El **email es el identificador único e inmutable** de la cuenta. Además, cada persona tiene un **username público y único** (`@usuario`, minúsculas, números y guion bajo, 3–30) que se propone automáticamente al alta y **sirve para que la encuentren sus contactos** (RF-S1). El correo identifica la cuenta; el username es cómo te encuentran, y por eso sí se puede cambiar.
- RF-A2. Al registrarse se crea automáticamente su fila en `profiles` (trigger).
- RF-A3. Login con email + contraseña; errores claros en español ("Credenciales incorrectas", "Sin conexión").
- RF-A4. Persistencia de sesión: en nativo con SecureStore/AsyncStorage como storage del cliente Supabase; en web con el storage por defecto. Auto-refresh de token activado.
- RF-A5. Rutas protegidas: sin sesión → redirect a `/login`; con sesión → redirect a `/(app)/calendar`. Implementado con grupos de Expo Router y un `AuthProvider`.
- RF-A6. Pantalla de **Perfil y ajustes**: identidad (avatar con iniciales, nombre visible, username, correo), resumen de uso en tarjetas (actividades del mes, amigos, temas propios, entrenamientos) y ajustes agrupados en tarjetas al estilo de una lista de configuración: accesos a temas / amigos / disponibilidad, estado de los recordatorios (RF-C10) y versión. Lo de la cuenta vive en la hoja de editar perfil (RF-A9); cerrar sesión es la acción destructiva final y pide confirmación (NFR-12). En modo demo se añade el cambio rápido de cuenta.
- RF-A7. Recuperación de contraseña por email (flujo estándar de Supabase).
- RF-A8. **Alta por pasos**, una pregunta por pantalla con indicador de progreso y vuelta atrás: (1) nombre, (2) correo, (3) **usuario**, (4) **código de un solo uso de 6 dígitos** enviado a ese correo, con opción de reenviarlo, (5) contraseña y confirmación. Verificar el código ya abre sesión, así que hasta fijar la contraseña la app se mantiene en el alta y no entra al calendario. Si se abandona después de verificar, la sesión se cierra: la cuenta queda creada sin contraseña y se recupera con RF-A7. El **usuario** se pide en su propio paso, entre el correo y el código: llega propuesto —el primero libre derivado del correo— y se puede aceptar o cambiar. Va ahí y no antes porque solo con el correo ya escrito se puede derivar una propuesta, y antes del código porque la cuenta nace al verificarlo y es el trigger de la base quien escribe el username.
- RF-A9. Desde Perfil, la tarjeta de identidad abre una hoja con **todo lo editable de la cuenta**: nombre, **username**, correo (visible pero bloqueado) y acceso a cambiar la contraseña. El username se puede cambiar **siempre y cuantas veces quiera**; se escribe sin arroba, se normaliza a minúsculas y se rechaza si ya lo tiene otra persona (índice único sobre `lower(username)`, así que `Pedro` y `pedro` son el mismo). La tarjeta muestra `@usuario` bajo el nombre, que es lo que se le pasa a alguien para que te encuentre. El cambio de contraseña pide la actual y la comprueba antes de aplicarlo.

## Fuera de alcance
OAuth social, verificación en dos pasos, borrado de cuenta in-app.

## Criterios de aceptación
- Given un email no registrado, When completa los 4 pasos del alta, Then queda autenticado, existe su profile y aterriza en el calendario.
- Given un email ya registrado, When lo escribe en el paso 2, Then ve "Ese correo ya está registrado" y no se envía ningún código.
- Given un código incorrecto, When lo envía, Then ve "El código no es correcto" y sigue en el paso 3.
- Given el alta verificada pero sin contraseña, When cierra la pantalla de registro, Then vuelve a login sin sesión abierta.
- Given sesión iniciada, When cambia su contraseña con la actual correcta, Then la anterior deja de funcionar y la nueva sí.
- Given sesión iniciada, When escribe mal su contraseña actual, Then ve "Credenciales incorrectas" y la contraseña no cambia.
- Given sesión iniciada, When cierra y reabre la app, Then sigue autenticado sin pantalla de login.
- Given sesión cerrada, When navega a cualquier ruta de la app, Then es redirigido a login.
- Given contraseña de 5 caracteres, When intenta registrarse, Then ve error de validación antes de llamar al backend.

## UI mínima
`/login`, `/register` (4 pasos), `/forgot-password`, `/(app)/profile`. Formularios simples, botón deshabilitado durante submit, estados de carga y error visibles (P9).
