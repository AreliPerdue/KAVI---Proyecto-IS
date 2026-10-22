-- KAVI Library · Journal como objeto (spec 13i §6, RF-JC1 – RF-JC9; T345).
--
-- Un Journal es una pieza de la librería (familia `creation`, tipo `journal`), con sus páginas en `page_count` (el
-- lomo engorda con ellas, RF-JC5) y su portada en `journal`: forma, encuadernación, material y su color, contraportada,
-- cantos y el color del hilo o del espiral (ver `src/lib/library/journal.ts`). La RLS es la de `library_items`: solo
-- de su dueño. Las texturas de los materiales viven en la app.
--
-- Solo agrega y se puede correr dos veces.

alter table public.library_items add column if not exists journal jsonb;

alter table public.library_items drop constraint if exists library_items_journal;
alter table public.library_items add constraint library_items_journal check (
  journal is null or (kind = 'journal' and jsonb_typeof(journal) = 'object' and octet_length(journal::text) <= 1048576)
);
