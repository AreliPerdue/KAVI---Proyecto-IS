# Medición de rendimiento (NFR-1, NFR-2)

**Fecha:** 23 de septiembre de 2026
**Escenario:** 500 actividades repartidas en un año, tres por día
**Cómo reproducirlo:**

```bash
EXPO_PUBLIC_DEMO_MODE=true EXPO_PUBLIC_DEMO_SEED_COUNT=500 npx expo start --web
```

`EXPO_PUBLIC_DEMO_SEED_COUNT` no genera nada si no se define, así que el modo
demostración normal sigue con sus datos de ejemplo.

## Resultados

| Requisito | Objetivo | Medido | |
|---|---|---|---|
| **NFR-1** · abrir el calendario | ≤ 3 s | **421 ms** | ✅ |
| **NFR-2** · mes siguiente (precargado) | sin spinner bloqueante | 149 ms, sin spinner | ✅ |
| **NFR-2** · mes anterior (precargado) | sin spinner bloqueante | 568 ms, sin spinner | ✅ |

La medición no se detiene al pintar la rejilla sino al aparecer los bloques de
actividad, que es lo que de verdad cuesta: una rejilla vacía se dibuja siempre
rápido y mediría otra cosa.

## Por qué sale así

Tres decisiones del diseño explican el margen sobre el objetivo:

- **Se consulta por rango visible**, no la agenda entera. Abrir septiembre pide las
  actividades de septiembre, no las 500.
- **Los meses adyacentes se precargan** mientras miras el actual, así que navegar
  encuentra los datos ya en memoria. De ahí que no haya spinner.
- **El índice `(owner_id, start_at)`** cubre exactamente esa consulta.

## Limitación

Las cifras son del backend en memoria, sin latencia de red. Contra Supabase hay que
sumar el tiempo de la petición, que en una conexión normal ronda los 100-300 ms: el
margen sobre los 3 segundos sigue siendo amplio, pero la cifra exacta dependerá de la
red de cada persona.
