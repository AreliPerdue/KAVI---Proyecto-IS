-- Colores de persona v3: vibrantes sin llegar a chillones.
--
-- Los HEX exactos de los Nobi (migración 20261004130000) resultaron demasiado saturados
-- (lima, amarillo, turquesa en neón) y los de nombre oscuro casi no se veían sobre la tinta
-- de la app. La paleta (src/constants/people-colors.ts) se reajustó en OKLCH: mismo matiz
-- de cada Nobi, saturación media-alta y todos ≥ 3:1 sobre el fondo oscuro.
--
-- Igual que la anterior: traduce el color de contactos y listas guardado con cualquier
-- paleta previa al color nuevo del mismo Nobi; lo personalizado no se toca y correrla dos
-- veces no cambia nada. El cliente hace la misma traducción al leer (`currentColor`).

with t (viejo, nuevo) as (
  values
    ('#FFC0F3', '#F6A9CD'),
    ('#AA0664', '#DB509C'),
    ('#F86061', '#F68675'),
    ('#980002', '#E24947'),
    ('#430000', '#B24755'),
    ('#FE6E00', '#F68C36'),
    ('#EDE609', '#F1D35D'),
    ('#AAFF00', '#A2DD5C'),
    ('#636B2F', '#8A9348'),
    ('#002D04', '#318C4C'),
    ('#00CED1', '#3ACCC5'),
    ('#89CFF0', '#86CBF3'),
    ('#0028B3', '#4087EE'),
    ('#000435', '#496BBA'),
    ('#3A00E7', '#7067E9'),
    ('#B47EDE', '#C9AAEE'),
    ('#6F2DA8', '#A878DB'),
    ('#35063E', '#934FA8'),
    ('#D3D3D3', '#EAE8E0'),
    ('#AAABB0', '#9FA5AE'),
    ('#232323', '#666B71'),
    ('#176BFF', '#4087EE'),
    ('#E3291F', '#E24947'),
    ('#1F8A4C', '#318C4C'),
    ('#8E3FBE', '#934FA8'),
    ('#B95D16', '#F68C36'),
    ('#12878C', '#3ACCC5'),
    ('#B02A78', '#DB509C'),
    ('#4F8C22', '#A2DD5C'),
    ('#6A5ACD', '#7067E9'),
    ('#B03A44', '#B24755'),
    ('#3E86C4', '#86CBF3'),
    ('#6B7A2E', '#8A9348'),
    ('#E51764', '#F6A9CD'),
    ('#4A6BBF', '#496BBA'),
    ('#8F731C', '#F1D35D'),
    ('#A96AE0', '#A878DB'),
    ('#8A8078', '#9FA5AE'),
    ('#A473C7', '#C9AAEE'),
    ('#5F7266', '#666B71'),
    ('#78899F', '#EAE8E0'),
    ('#DA6C50', '#F68675'),
    ('#4C8DFF', '#4087EE'),
    ('#B06BFF', '#C9AAEE'),
    ('#46C46A', '#318C4C'),
    ('#FF7B6B', '#F68675'),
    ('#35C7D8', '#3ACCC5'),
    ('#E3C245', '#F1D35D'),
    ('#F26BD1', '#DB509C'),
    ('#A8D45A', '#A2DD5C')
),
contactos as (
  update public.contact_colors c
     set color = t.nuevo
    from t
   where upper(c.color) = t.viejo
  returning c.color
)
update public.lists l
   set color = t.nuevo
  from t
 where upper(l.color) = t.viejo;
