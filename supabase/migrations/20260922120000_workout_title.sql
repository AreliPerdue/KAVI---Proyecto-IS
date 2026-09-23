-- Nombre propio del entrenamiento (RF-F7).
--
-- Hasta ahora el encabezado salía del título de la actividad ligada, y los
-- entrenamientos libres se llamaban todos "Entrenamiento libre" sin poder
-- cambiarlo. Con esta columna cada sesión puede tener su propio nombre —"Pierna",
-- "Empuje A"—, que además es lo que se propone al crear la siguiente.
--
-- Es opcional: un entrenamiento sin nombre sigue mostrando el título de su
-- actividad, y si tampoco lo tiene, el texto de reserva.

alter table public.workouts
  add column title text check (char_length(trim(title)) between 1 and 80);

comment on column public.workouts.title is
  'Nombre propio de la sesión. Si es null se usa el título de la actividad ligada.';
