-- Confirmación de asistencia con tres respuestas (RF-S19).
--
-- Una invitación a una actividad es una pregunta de asistencia, y «sí» o «no» no
-- cubren el caso más común: quien aún no sabe. Sin un «tal vez», esa persona se ve
-- obligada a mentir en una dirección o a dejar la invitación sin responder, que para
-- quien organiza es indistinguible de que no la haya visto.

alter table public.activity_shares
  drop constraint if exists activity_shares_status_check;

alter table public.activity_shares
  add constraint activity_shares_status_check
  check (status in ('pending', 'accepted', 'maybe', 'declined'));

comment on column public.activity_shares.status is
  'Respuesta a la invitación: pending (sin responder), accepted, maybe o declined (RF-S19).';
