-- T223 · Spec 10 RF-L11b — Recordatorio propio de un elemento de lista
--
-- Hasta ahora la hora del elemento hacía de dos cosas a la vez: decía *cuándo es* y
-- *cuándo avisar*. Son preguntas distintas: "hay que entregarlo el 3" y "avísame dos días
-- antes" se contestan por separado, y con una sola columna la segunda no tenía dónde vivir.
--
-- El desfase se guarda en minutos antes del vencimiento, igual que en `reminders` para las
-- actividades (RF-C9), para que la app tenga un solo concepto de "cuánto antes".

alter table public.list_items
  add column if not exists reminder_offset_minutes int
    check (reminder_offset_minutes is null or reminder_offset_minutes >= 0);

comment on column public.list_items.reminder_offset_minutes is
  'Minutos antes del vencimiento en que avisar. NULL = sin recordatorio. Cuando el elemento '
  'no tiene hora, el aviso se calcula sobre una hora por omisión del día, porque "dos días '
  'antes" de una fecha sin hora no tiene instante propio.';
