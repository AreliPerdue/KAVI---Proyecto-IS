# Spec 03 — Autenticación y perfil (F1)

## Objetivo
Registro, inicio de sesión y sesión persistente con Supabase Auth (email + contraseña), y perfil básico editable.

## Historias de usuario
- HU-A1: Yo como persona usuaria, quiero registrarme con correo y contraseña para tener mi calendario personal.
- HU-A2: Yo como persona usuaria, quiero iniciar sesión y que la sesión persista para no autenticarme cada vez.
- HU-A3: Yo como persona usuaria, quiero editar mi nombre visible y username para que mis contactos me identifiquen.
- HU-A4: Yo como persona usuaria, quiero cerrar sesión para proteger mi cuenta en dispositivos compartidos.

## Requerimientos funcionales
- RF-A1. Registro con email, contraseña (mín. 8 caracteres) y username único.
- RF-A2. Al registrarse se crea automáticamente su fila en `profiles` (trigger).
- RF-A3. Login con email + contraseña; errores claros en español ("Credenciales incorrectas", "Sin conexión").
- RF-A4. Persistencia de sesión: en nativo con SecureStore/AsyncStorage como storage del cliente Supabase; en web con el storage por defecto. Auto-refresh de token activado.
- RF-A5. Rutas protegidas: sin sesión → redirect a `/login`; con sesión → redirect a `/(app)/calendar`. Implementado con grupos de Expo Router y un `AuthProvider`.
- RF-A6. Pantalla de perfil: ver/editar display_name y username; cerrar sesión.
- RF-A7. Recuperación de contraseña por email (flujo estándar de Supabase).

## Fuera de alcance
OAuth social, verificación en dos pasos, borrado de cuenta in-app.

## Criterios de aceptación
- Given un email no registrado, When completa registro válido, Then queda autenticado, existe su profile y aterriza en el calendario.
- Given un username ya tomado, When intenta registrarse, Then ve "Ese username ya está en uso" y no se crea la cuenta.
- Given sesión iniciada, When cierra y reabre la app, Then sigue autenticado sin pantalla de login.
- Given sesión cerrada, When navega a cualquier ruta de la app, Then es redirigido a login.
- Given contraseña de 5 caracteres, When intenta registrarse, Then ve error de validación antes de llamar al backend.

## UI mínima
`/login`, `/register`, `/forgot-password`, `/(app)/profile`. Formularios simples, botón deshabilitado durante submit, estados de carga y error visibles (P9).
