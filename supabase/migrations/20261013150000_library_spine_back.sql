-- KAVI Library · Lomo y contraportada (spec 13a, RF-BL20 – RF-BL21, T311; idea de KAVI Reader).
--
-- Además de la portada, cada libro puede tener una imagen propia de lomo y de contraportada, cada una
-- con su color. Sin imagen, el lomo y la contraportada salen del color de la portada. Las imágenes van
-- en R2, en la carpeta del libro, como las portadas.
alter table public.library_items
  add column if not exists spine_path text,
  add column if not exists spine_color text,
  add column if not exists back_cover_path text,
  add column if not exists back_cover_color text;

alter table public.library_items drop constraint if exists library_items_spine_color_check;
alter table public.library_items
  add constraint library_items_spine_color_check check (spine_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.library_items drop constraint if exists library_items_back_cover_color_check;
alter table public.library_items
  add constraint library_items_back_cover_color_check check (back_cover_color ~ '^#[0-9A-Fa-f]{6}$');
