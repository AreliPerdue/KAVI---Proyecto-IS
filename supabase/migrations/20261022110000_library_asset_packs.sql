-- KAVI Library · Packs de papeles y más en la tienda (spec 13h, RF-CC17; T343c).
--
-- La tienda de stickers (T337) también vende packs para el lienzo creativo: papeles, notas, cintas y doodles en
-- grises que se recolorean. Van en la misma tabla con `kind = 'assets'` y en el mismo bucket público `stickers`
-- (`<pack>/<nombre>.png`, `<pack>/muestra.png`). De cada pieza, además de su nombre y su proporción: su categoría
-- (`papel`, `nota`, `cinta`, `doodle`), cómo se recolorea (`textura` o `trazo`) y su nombre en los dos idiomas.
--
-- El primero: "Papelería". Solo agrega y se puede correr dos veces.

alter table public.sticker_packs add column if not exists kind text not null default 'stickers';
alter table public.sticker_packs drop constraint if exists sticker_packs_kind_check;
alter table public.sticker_packs add constraint sticker_packs_kind_check check (kind in ('stickers', 'assets'));

insert into public.sticker_packs (id, collection, color, name_es, name_en, sort_order, stickers, bytes, version, kind)
values (
  'papeleria',
  'lienzo',
  null,
  'Papelería',
  'Stationery',
  1,
  '[{"name": "papel-periodico", "ar": 1.225, "category": "papel", "mode": "textura", "label_es": "Papel de periódico", "label_en": "Newspaper"}, {"name": "papel-perforado", "ar": 1.299, "category": "papel", "mode": "textura", "label_es": "Papel perforado", "label_en": "Perforated paper"}, {"name": "papel-con-clip", "ar": 1.25, "category": "papel", "mode": "textura", "label_es": "Papel con clip", "label_en": "Paper with a clip"}, {"name": "papel-kraft", "ar": 1.162, "category": "papel", "mode": "textura", "label_es": "Papel kraft", "label_en": "Kraft paper"}, {"name": "sobre", "ar": 0.657, "category": "papel", "mode": "textura", "label_es": "Sobre", "label_en": "Envelope"}, {"name": "sello-postal", "ar": 1.19, "category": "nota", "mode": "textura", "label_es": "Sello postal", "label_en": "Postage stamp"}, {"name": "esquina-de-foto", "ar": 1, "category": "nota", "mode": "textura", "label_es": "Esquina de foto", "label_en": "Photo corner"}, {"name": "cinta-corazones", "ar": 0.21, "category": "cinta", "mode": "textura", "label_es": "Cinta de corazones", "label_en": "Hearts tape"}, {"name": "cinta-estrellas", "ar": 0.21, "category": "cinta", "mode": "textura", "label_es": "Cinta de estrellas", "label_en": "Stars tape"}, {"name": "cinta-zigzag", "ar": 0.21, "category": "cinta", "mode": "textura", "label_es": "Cinta zigzag", "label_en": "Zigzag tape"}, {"name": "marco-a-mano", "ar": 0.75, "category": "doodle", "mode": "trazo", "label_es": "Marco a mano", "label_en": "Hand-drawn frame"}, {"name": "burbuja", "ar": 0.808, "category": "doodle", "mode": "trazo", "label_es": "Burbuja de diálogo", "label_en": "Speech bubble"}, {"name": "nube-de-pensamiento", "ar": 0.815, "category": "doodle", "mode": "trazo", "label_es": "Nube de pensamiento", "label_en": "Thought cloud"}, {"name": "flor", "ar": 1.238, "category": "doodle", "mode": "trazo", "label_es": "Flor", "label_en": "Flower"}, {"name": "hoja", "ar": 1.625, "category": "doodle", "mode": "trazo", "label_es": "Hoja", "label_en": "Leaf"}, {"name": "subrayado", "ar": 0.188, "category": "doodle", "mode": "trazo", "label_es": "Subrayado", "label_en": "Underline"}, {"name": "espiral", "ar": 1, "category": "doodle", "mode": "trazo", "label_es": "Espiral", "label_en": "Spiral"}]'::jsonb,
  821140,
  1,
  'assets'
)
on conflict (id) do update
  set name_es = excluded.name_es,
      name_en = excluded.name_en,
      stickers = excluded.stickers,
      bytes = excluded.bytes,
      version = excluded.version,
      kind = excluded.kind;
