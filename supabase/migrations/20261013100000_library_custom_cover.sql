-- KAVI Library · Portada propia (spec 13a, RF-BL23, T314).
--
-- La portada que trae el archivo (imagen del EPUB o primera página del PDF) se queda en
-- `cover_path`/`cover_color`; la que pone la persona va aparte. Así "Volver a la original" solo
-- quita la propia, sin tener que volver a sacar la portada del archivo. La app muestra la propia si
-- existe. El archivo vive en R2, en la carpeta de la pieza, como las demás (spec 13 §5).
alter table public.library_items
  add column if not exists custom_cover_path text,
  add column if not exists custom_cover_color text;

alter table public.library_items drop constraint if exists library_items_custom_cover_color_check;
alter table public.library_items
  add constraint library_items_custom_cover_color_check check (custom_cover_color ~ '^#[0-9A-Fa-f]{6}$');
