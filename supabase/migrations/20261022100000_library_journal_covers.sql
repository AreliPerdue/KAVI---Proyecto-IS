-- KAVI Library · Decorar el Journal (spec 13i, RF-JC10 – RF-JC11; T346).
--
-- La portada, el lomo y la contraportada se decoran con el mismo lienzo creativo que los recortes y las páginas (13h,
-- RF-CC3): son lienzos de `library_canvases` con contexto `cover` y su cara en `face`. Un Journal tiene a lo más una
-- de cada cara; se crean cuando se decora esa cara por primera vez. Al borrar el Journal se van con él (como sus
-- páginas). Las políticas de `library_canvases` ya dicen que solo son de su dueño y de un Journal suyo.
--
-- Solo agrega y se puede correr dos veces.

alter table public.library_canvases drop constraint if exists library_canvases_context_check;
alter table public.library_canvases
  add constraint library_canvases_context_check check (context in ('book', 'journal', 'cover'));

alter table public.library_canvases
  add column if not exists face text check (face in ('front', 'spine', 'back'));

-- Una cara es de una tapa, y una tapa siempre dice su cara y de qué Journal es.
alter table public.library_canvases drop constraint if exists library_canvases_cover_face;
alter table public.library_canvases
  add constraint library_canvases_cover_face check ((context = 'cover') = (face is not null) and (context <> 'cover' or item_id is not null));

create unique index if not exists uq_library_canvases_cover_face
  on public.library_canvases (item_id, face) where context = 'cover';
