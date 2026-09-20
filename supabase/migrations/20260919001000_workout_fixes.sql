-- T144 · Fitness: nombre de ejercicio vacío y duración derivada (spec 07)

/*
 * "+ Ejercicio" crea la tarjeta en blanco y el nombre se escribe dentro (RF-F4), así
 * que la fila nace con `name = ''`. El check exigía 1 carácter —un mínimo que la
 * spec 02 nunca pidió— y hacía fallar el alta de todo ejercicio. Se conserva el tope
 * de 80; el mínimo lo pide la interfaz, no la base.
 */
alter table public.workout_exercises drop constraint workout_exercises_name_check;
alter table public.workout_exercises
  add constraint workout_exercises_name_check check (char_length(name) <= 80);

/*
 * La duración total deja de capturarse a mano: se calcula sumando la duración de
 * los ejercicios registrados. Guardar además un total escrito por la persona abría
 * la puerta a que ambos números se contradijeran.
 */
alter table public.workouts drop column duration_minutes;
