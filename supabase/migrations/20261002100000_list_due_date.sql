-- T232 · Spec 10 RF-L23 — Fecha de la lista completa
--
-- Distinta de la fecha de un elemento: "la lista de empaque es para el sábado" no es lo
-- mismo que "comprar pilas el sábado". La de la lista dice para cuándo tiene que estar
-- lista **entera**; las de los elementos siguen siendo suyas y no se tocan.
--
-- Es `date` y no `timestamptz` por lo mismo que `list_items.due_date`: es un día del
-- calendario de quien lo escribió, no un instante, y como instante UTC se correría de día
-- al cruzar husos horarios.

alter table public.lists
  add column if not exists due_date date;
