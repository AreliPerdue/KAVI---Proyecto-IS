-- KAVI Library · Papelería, versión 3 (T343c): la muestra nueva se subió después de que la CDN guardara la vieja con
-- `?v=2`; con `?v=3` todos piden la nueva. Se puede correr dos veces.

update public.sticker_packs set version = 3 where id = 'papeleria' and version < 3;
