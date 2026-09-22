-- BLACK DIAMOND — 0007_repeat_last_service.sql
-- "Repetir o último agendamento" na página pública de agendamento.
-- Dado o WhatsApp do cliente, devolve o último serviço agendado (passado,
-- não cancelado e ainda ativo na barbearia) — sem expor mais nada do cliente.

create or replace function public.get_client_last_service(
  p_barbershop_id uuid,
  p_phone         text
)
returns table (
  service_id       uuid,
  service_name     text,
  price            numeric,
  duration_minutes integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  return query
  select s.id, s.name, s.price, s.duration_minutes
  from public.appointments a
  join public.services s
    on s.id = a.service_id
   and s.barbershop_id = p_barbershop_id
  where a.barbershop_id = p_barbershop_id
    and a.client_whatsapp = v_phone
    and a.status <> 'cancelado'
    and a.start_at < now()
    and s.is_active is true
  order by a.start_at desc
  limit 1;
end;
$$;

revoke all on function public.get_client_last_service(uuid, text) from public;
grant execute on function public.get_client_last_service(uuid, text) to anon, authenticated;