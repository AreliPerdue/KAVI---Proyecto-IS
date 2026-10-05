-- T263 · Eliminar cuenta (spec 03, RF-A12).
--
-- Google Play y Apple exigen que una app con registro permita borrar la cuenta desde la app, y
-- el aviso de privacidad la ofrece como vía de cancelación. El borrado es inmediato y total:
-- se borra el usuario de `auth.users` y todo lo suyo cae en cascada (`profiles` → cada tabla con
-- `owner_id`). Lo que alguien más tenía de esta persona se resuelve con las mismas reglas que
-- ya existen: `on delete cascade` (lo que le compartía deja de verse) o `set null` (quién palomeó
-- un pendiente de una lista ajena).
--
-- `security definer` porque solo el dueño de la función puede tocar `auth.users`; `auth.uid()`
-- limita el borrado a la propia cuenta, así que nadie puede borrar a otra persona. La
-- contraseña se comprueba antes en el cliente (volviendo a iniciar sesión), igual que al
-- cambiarla (RF-A9).

-- Un pendiente hecho en la lista de otra persona guarda quién lo palomeó (`completed_by`, `on delete set
-- null`). El check original exigía que `completed_at` y `completed_by` fueran nulos o no nulos a la vez,
-- así que borrar la cuenta de quien palomeó dejaba `completed_at` sin `completed_by` y **todo el borrado
-- fallaba**. Ahora el pendiente sigue hecho aunque quien lo palomeó ya no exista; lo que sí se mantiene es
-- que nadie puede figurar como autor de algo sin hacer.
alter table public.list_items drop constraint if exists list_items_check;
alter table public.list_items drop constraint if exists list_items_completed_check;
alter table public.list_items add constraint list_items_completed_check
  check (completed_by is null or completed_at is not null);

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Necesitas iniciar sesión para eliminar tu cuenta.' using errcode = '42501';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
