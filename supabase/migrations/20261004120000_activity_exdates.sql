-- T249 · Una ocurrencia borrada de una serie ya no vuelve a aparecer (RF-C8).
--
-- La serie guarda su regla en la actividad madre y materializa instancias hasta un
-- horizonte; cada vez que se abre el calendario, `extendRecurrenceHorizon` rellena desde la
-- última instancia existente. Borrar "solo esta" quitaba la fila sin dejar rastro, así que
-- si era la última (el viernes final de una serie con fecha de fin) se volvía a crear.
--
-- `recurrence_exdates` es el equivalente de `EXDATE` (RFC 5545): los días, en la zona de
-- quien la creó, que la serie ya no debe generar. Vive en la madre, como la regla. Son
-- fechas y no instantes para que sigan valiendo si después cambia la hora de la serie.
--
-- Solo agrega una columna con valor por omisión: las políticas de `activities` ya cubren
-- quién puede escribirla (su dueño), y el código anterior sigue funcionando sin cambios.

alter table public.activities
  add column if not exists recurrence_exdates date[] not null default '{}';

comment on column public.activities.recurrence_exdates is
  'Días excluidos de la serie (EXDATE). Solo en la actividad madre (recurrence_rule no nulo).';
