-- Cumpleaños en el perfil (RF-A10).
--
-- Se guarda como `date` completa, con año, y no como mes/día sueltos: la fecha real
-- permite calcular la edad si algún día hace falta, y descartar el año después es
-- trivial mientras que recuperarlo es imposible.
--
-- Lo ven los contactos aceptados, que es el punto: el cumpleaños aparece en el
-- calendario de quienes te tienen agregado. La política de lectura de `profiles` ya
-- lo permite, así que no hace falta abrir nada más.

alter table public.profiles
  add column birthday date check (birthday > '1900-01-01' and birthday <= current_date);

comment on column public.profiles.birthday is
  'Fecha de nacimiento. Visible para los contactos, que la ven en su calendario.';
