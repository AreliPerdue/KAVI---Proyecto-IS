-- T202 · Los colores de persona pasan a ser los del Nobi, tal cual.
--
-- La paleta de personas (src/constants/people-colors.ts) cambió de hex: antes eran tonos
-- ajustados para contraste; ahora son los colores de cada Nobi. Lo guardado con la paleta
-- anterior —el color que cada quien eligió para un contacto y el de cada lista— se traduce
-- aquí al color nuevo del mismo Nobi. Sin esto, esos contactos se verían con el tono viejo
-- y como "Personalizado", y editar una lista vieja fallaría porque su color ya no está en
-- la paleta que acepta el formulario.
--
-- Incluye la primera paleta de 8 colores (hasta el 23 sep 2026). Lo que no está en
-- ninguna paleta no se toca. Correrla dos veces no cambia nada: los hex nuevos no están
-- en la tabla de equivalencias. El cliente hace la misma traducción al leer
-- (`currentColor`), por si algo se escribió con la versión anterior de la app.

with t (viejo, nuevo) as (
  values
    ('#176BFF', '#0028B3'),
    ('#E3291F', '#980002'),
    ('#1F8A4C', '#002D04'),
    ('#8E3FBE', '#35063E'),
    ('#B95D16', '#FE6E00'),
    ('#12878C', '#00CED1'),
    ('#B02A78', '#AA0664'),
    ('#4F8C22', '#AAFF00'),
    ('#6A5ACD', '#3A00E7'),
    ('#B03A44', '#430000'),
    ('#3E86C4', '#89CFF0'),
    ('#6B7A2E', '#636B2F'),
    ('#E51764', '#FFC0F3'),
    ('#4A6BBF', '#000435'),
    ('#8F731C', '#EDE609'),
    ('#A96AE0', '#6F2DA8'),
    ('#8A8078', '#AAABB0'),
    ('#A473C7', '#B47EDE'),
    ('#5F7266', '#232323'),
    ('#78899F', '#D3D3D3'),
    ('#DA6C50', '#F86061'),
    ('#4C8DFF', '#0028B3'),
    ('#B06BFF', '#B47EDE'),
    ('#46C46A', '#002D04'),
    ('#FF7B6B', '#F86061'),
    ('#35C7D8', '#00CED1'),
    ('#E3C245', '#EDE609'),
    ('#F26BD1', '#AA0664'),
    ('#A8D45A', '#AAFF00')
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
