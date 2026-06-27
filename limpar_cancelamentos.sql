-- Remove todos os agendamentos cancelados (testes)
DELETE FROM bookings WHERE status = 'cancelled';

-- Remove clientes bloqueados de teste
DELETE FROM clients WHERE name = 'BLOQUEADO' AND phone = '00000000000';
