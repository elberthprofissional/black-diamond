-- =========================================================================
-- Migration: Professional Client Soft Delete
-- =========================================================================
-- Substitui o soft-delete feio (mudar nome pra 'CLIENTE EXCLUIDO' e
-- telefone pra 'DELETED_id') por uma coluna deleted_at profissional.
-- =========================================================================

-- Adiciona coluna deleted_at
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Migra registros existentes que foram soft-deletados pelo método antigo
UPDATE clients SET deleted_at = NOW() WHERE name = 'CLIENTE EXCLUIDO';

CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at);
