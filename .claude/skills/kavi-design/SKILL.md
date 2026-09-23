---
name: kavi-design
description: Sistema de diseño y reglas UI/UX de KAVI. Úsala SIEMPRE que una tarea cree o cambie algo visible (pantallas, componentes, colores, tipografía, estados, animación, textos de UI). Sintetiza frontend-design, ui-ux-pro-max y vercel-react-native-skills para este producto.
---

# kavi-design — Cómo se ve y se siente KAVI

Skill de proyecto. Aplica junto con `kavi-dev`. Las specs (`specs/04`–`07`) mandan sobre cualquier preferencia estética.

## 1. Tesis visual (de frontend-design)
KAVI es un planificador personal donde **el calendario es la estrella** y las **7 dimensiones del bienestar** son el lenguaje de color.
- **La app es monocroma; tu vida trae el color.** Chrome (fondos, texto, botones, tabs) en neutros de tinta. Todo color saturado proviene de la dimensión/tema de una actividad. Así el calendario se lee como un mapa de en qué inviertes tu tiempo.
- **Elemento firma:** los bloques y puntos de actividad con el color de su dimensión, y el "anillo de dimensiones" (7 chips de filtro con sus hues) en el header del calendario. Nada más compite en color.
- **Un riesgo consciente:** botón primario y FAB en tinta casi negra (`ink`) en claro / blanco hueso en oscuro, no en azul genérico. La marca se reconoce por contraste y por los 7 hues, no por un "brand blue".
- Evitar los defaults de IA: crema + serif + terracota; negro + verde ácido; layout de periódico con hairlines. KAVI es limpio, cálido-neutro, con esquinas continuas y tipografía sans del sistema.

## 2. Tokens (fuente única: `src/constants/theme.ts`)
Nunca hex sueltos en componentes; todo pasa por tokens semánticos.

### Color (claro / oscuro)
**KAVI arranca en oscuro y la apariencia se elige** en Perfil → Presentación: Sistema / Claro /
Oscuro (NFR-18). `useResolvedScheme()` resuelve esa preferencia contra `useColorScheme()` y
`app.json` fija `userInterfaceStyle: "automatic"`. Los dos temas son de primera clase: ninguna
pantalla puede dar por hecho el oscuro. Todo el sistema neutro se deriva de dos anclas — tinta
`#131313` y blanco contrastante `#F2F2F2` — que se intercambian entre temas.
La única excepción es el splash, siempre oscuro: el nativo se fija antes de que haya JavaScript
para leer la preferencia y el logo es de contorno blanco.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `background` | `#F2F2F2` | `#131313` | fondo de pantalla |
| `surface` | `#FFFFFF` | `#1A1A1A` | tarjetas, sheets, inputs |
| `surfaceAlt` | `#E6E6E6` | `#232323` | celdas alternas, chips inactivos |
| `border` | `#D4D4D4` | `#303030` | separadores, bordes de input |
| `text` | `#131313` | `#F2F2F2` | texto primario (≥ 4.5:1) |
| `textSecondary` | `#565656` | `#ABABAB` | texto secundario (≥ 4.5:1) |
| `textTertiary` | `#6E6E6E` | `#8C8C8C` | metadatos (solo ≥ 14px) |
| `ink` (primario) | `#131313` | `#F2F2F2` | botón primario, FAB, selección y el **indicador de hoy / hora actual** (el número del día, la línea de ahora y su píldora van en `ink` con el texto en `onInk`) |
| `onInk` | `#F2F2F2` | `#131313` | texto sobre `ink` |
| `today` | `#BC3617` | `#FF7A5C` | acento cálido de **aviso**: recordatorio vencido, filtros activos, choque de horario |
| `danger` | `#B81E2F` | `#FF6B7A` | destructivo, errores |
| `success` | `#116B36` | `#3DD68C` | confirmaciones |
| `neutralActivity` | `#747474` | `#7C7C7C` | actividad sin tema (RF-T4) |
| `overlay` | `rgba(19,19,19,0.45)` | `rgba(0,0,0,0.66)` | scrim de sheets |

Colores de dimensión (spec 05, fijos): física `#4CAF50`, emocional `#E91E63`, social `#FF9800`, intelectual `#2196F3`, espiritual `#9C27B0`, financiera `#009688`, ocupacional `#607D8B`. Sobre estos colores el texto va en blanco; en fondos claros se usan al 100 % para bordes/puntos y al 14 % como relleno de bloque con el texto en `text`.

### Tipografía
- Familia de interfaz: sistema (SF Pro en iOS, Roboto en Android, Inter/system-ui en web). Todo el texto de producto va aquí.
- **Fuentes de marca (única excepción, NFR-19)**: el wordmark "KAVI" en **Moirai One** y el eslogan "Plan more. be more." en **Poiret One**, ambas solo dentro de `components/ui/Wordmark` y del logo del splash. Nunca en botones, encabezados de pantalla ni cuerpo de texto: son display de contorno y a tamaño de interfaz pierden legibilidad. Se sirven desde `public/fonts/` — embebidas en nativo por el config plugin de `expo-font` y declaradas con `@font-face` en `src/global.css` para web — y se referencian por `BrandFonts` (nombre PostScript, igual en las 3 plataformas), nunca por string suelto.
- Escala (px / peso / interlineado): `display` 34/700/40 · `title` 28/700/34 · `heading` 20/600/26 · `body` 16/400/24 · `bodyStrong` 16/600/24 · `label` 14/500/20 · `caption` 12/500/16.
- Jerarquía por peso y color antes que por tamaño. Números tabulares (`fontVariant: ['tabular-nums']`) en horas y fechas.
- Body mínimo 16; nunca texto < 12.

### Espaciado, forma, elevación
- Ritmo 4/8: `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `2xl` 32 · `3xl` 48.
- Radios: `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `full` 999. Siempre con `borderCurve: 'continuous'`.
- Elevación: una sola sombra `boxShadow: '0 4px 16px rgba(22,23,26,0.08)'` para FAB/sheets; el resto sin sombra, separado por `border`.
- Touch target mínimo 44×44 (iOS) / 48×48 (Android); `hitSlop` cuando el icono sea menor.
- Iconos: `lucide-react-native`, tamaño 20 (inline) / 24 (acción) / 28 (tab), `strokeWidth` 2. Nunca emojis como iconos.

### Movimiento
- Duraciones: `fast` 120 ms (press) · `base` 200 ms (cambio de estado) · `slow` 320 ms (sheets, cambio de vista). Easing estándar; salida más rápida que entrada.
- Press: opacidad 0.85 o `surfaceAlt` de fondo; nunca escala que mueva el layout.
- Respetar reduced motion: sin animación de entrada, solo cambio inmediato.

## 3. Patrones por pantalla (de ui-ux-pro-max: Calendar & Scheduling → Flat + micro-interacciones)
- **Calendario:** header con mes/rango + selector de vista (segmented) + botón de filtros; grid mensual con puntos de color por dimensión; semana/día con bloques posicionados por hora, línea `today` de hora actual; FAB "+" abajo-derecha respetando safe area y tab bar.
- **Formularios:** etiquetas visibles (no solo placeholder), error junto al campo, botón deshabilitado durante submit, teclado adecuado (`email-address`, `numeric`), `autoComplete`/`textContentType` para gestores de contraseñas.
- **Sheets de detalle:** acciones como filas grandes (≥ 52 px), acción destructiva al final en `danger`, cierre por scrim y por botón.
- **Estados:** skeleton con la forma del contenido; vacío = 1 frase + acción ("Sin actividades este día. Toca + para agendar"); error = qué pasó + "Reintentar"; sin conexión = banner discreto arriba.
- **Web (NFR-9):** ancho máximo de contenido 1100 px centrado; semana completa visible ≥ 1024 px; hover con transición 150 ms; `cursor: pointer` en lo clicable; foco visible con anillo `ink` 2 px.
- **Tabs:** máximo 4 (Calendario · Compartido · Fitness · Perfil) nativos; badge numérico en Compartido para invitaciones.

## 4. Redacción de UI (es-MX)
- Voz directa y activa, oración en minúsculas salvo inicio ("Guardar cambios", no "SUBMIT").
- El botón dice lo que hace y conserva el nombre en todo el flujo: "Compartir" → toast "Compartida con Ana".
- Errores: qué pasó + cómo resolverlo, sin disculpas ni vaguedad ("Credenciales incorrectas. Revisa tu correo y contraseña").
- Vacíos invitan a actuar. Nada de jerga técnica (nunca "RLS", "token", "query").
- Fechas y horas en formato es-MX con `date-fns` locale `es` ("lun 7 sep", "14:30").

## 5. Accesibilidad mínima (CRÍTICO)
- Contraste ≥ 4.5:1 texto normal en ambos temas; ≥ 3:1 iconos con significado y bordes de controles.
- `accessibilityRole` y `accessibilityLabel` en todo control interactivo; iconos decorativos junto a texto ocultos (`accessible={false}` / `aria-hidden`).
- Orden de foco = orden visual. Foco visible en web. Estado seleccionado/expandido anunciado (`accessibilityState`).
- El color nunca es el único indicador (los bloques de dimensión llevan icono o texto).
- Dynamic Type/tamaño de fuente grande no rompe layouts: sin alturas fijas en filas de texto.

## 6. Checklist de entrega UI (de ui-ux-pro-max pro-rules, obligatorio antes de marcar una tarea con UI)
- [ ] Tokens semánticos, cero hex sueltos
- [ ] Iconos lucide, mismo estilo y strokeWidth; sin emojis
- [ ] Feedback de press en todo lo tocable, sin mover layout
- [ ] Touch targets ≥ 44/48 y `hitSlop` donde aplique
- [ ] Safe areas respetadas (header, tab bar, FAB, CTA inferior)
- [ ] Contenido scrollable no queda bajo barras fijas
- [ ] Claro y oscuro revisados por separado
- [ ] Estados carga / vacío / error / sin conexión presentes
- [ ] Textos en español es-MX, verbos claros, sin jerga
- [ ] Probado en 375 px de ancho y en web ≥ 1024 px
- [ ] Reduced motion respetado

## 7. Cuándo consultar ui-ux-pro-max
Para una duda puntual (p. ej. validación de formularios, foco en modales, chips que se parten):
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<2-5 términos>" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<términos>" --stack react-native
```
Trata el resultado como recomendación; esta skill y las specs tienen prioridad.
