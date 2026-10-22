-- KAVI Library · Papelería, versión 4 (T369): doodles redibujados con pluma de presión (marco, burbuja, nube, flor,
-- hoja, subrayado, espiral), el dibujo del sello postal y su muestra. Las proporciones no cambian; el peso sí.
-- Se puede correr dos veces.

update public.sticker_packs set version = 4, bytes = 861597 where id = 'papeleria' and version < 4;
