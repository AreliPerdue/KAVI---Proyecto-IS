-- KAVI Library · Papelería, versión 2 (T343c): su muestra con fondo de papel claro, para que sus doodles se vean en la
-- tarjeta de la tienda. Subir la versión cambia la dirección de sus imágenes (`?v=2`) y nadie se queda con la vieja en
-- caché. Se puede correr dos veces.

update public.sticker_packs set version = 2 where id = 'papeleria' and version < 2;
