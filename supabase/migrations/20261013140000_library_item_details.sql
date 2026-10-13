-- KAVI Library · Más datos del libro (spec 13a, RF-BL19, T310; idea de KAVI Reader).
--
-- Todos opcionales: editorial, lugar de publicación, edición, número de capítulos y sinopsis. Un EPUB
-- propone la editorial y la sinopsis desde su OPF; lo demás lo escribe la persona.
alter table public.library_items
  add column if not exists publisher text check (publisher is null or char_length(publisher) <= 200),
  add column if not exists publish_place text check (publish_place is null or char_length(publish_place) <= 200),
  add column if not exists edition text check (edition is null or char_length(edition) <= 100),
  add column if not exists chapter_count int check (chapter_count is null or chapter_count between 0 and 10000),
  add column if not exists synopsis text check (synopsis is null or char_length(synopsis) <= 10000);
