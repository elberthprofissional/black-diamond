-- Migration: add loyalty configuration table
-- Stores the number of visits required for a free service reward
-- and the service that will be granted as the reward.

create table if not exists loyalty_config (
  id uuid primary key default uuid_generate_v4(),
  visit_threshold integer not null,
  reward_service_id uuid not null,
  enabled boolean default false,
  created_at timestamp with time zone default now()
);

-- Admin configura via Settings (nenhum insert padrão)
