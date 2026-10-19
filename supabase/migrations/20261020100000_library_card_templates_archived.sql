-- KAVI Library · Fichas (spec 13d, RF-BF5; T293).
--
-- Cambiar el diseño de una plantilla pregunta si aplicarlo también a las fichas ya llenas. Si la persona dice
-- "solo a las nuevas", la versión de antes se guarda archivada (sus fichas la siguen usando) y la nueva
-- ocupa su lugar en la lista. Una archivada no se ofrece para fichas nuevas. Las políticas de la tabla no
-- cambian (solo lo propio).

alter table public.library_card_templates add column if not exists archived boolean not null default false;
