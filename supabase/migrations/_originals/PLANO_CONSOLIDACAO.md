# Migrations Consolidadas

Os arquivos originais (001 a 012) foram consolidados em 6 grupos lógicos:

| Grupo | Arquivos Originais | Conteúdo |
|-------|-------------------|----------|
| **01** | 001 + 002 | Schema inicial + RLS (tabelas, índices, políticas) |
| **02** | 003 + 004 + 005 | Funções de negócio + Triggers + Seeds |
| **03** | 006 + 007 | Multi-barbeiro + Mensalista |
| **04** | 008 + 009 + 010_fix_rpc | Auto-complete + Ajustes |
| **05** | 010_fix_notification + 011 | Notificações + Assinaturas |
| **06** | 012 (corrigido) | Modelo mensal (1 pagamento = 1 mês) |

## ⚠️ Importante

A migration 012 corrigida **precisa ser executada manualmente** no SQL Editor do Supabase:

1. Abra: https://supabase.com/dashboard/project/dbukdhycfaibdshxnatt/sql/new
2. Copie o conteúdo de: `scripts/_RODAR_NO_SQL_EDITOR.sql`
3. Cole e clique em "Run"

## O que mudou na correção da 012

**ANTES:** Pagava e ganhava +30 dias ou mês atual + mês que vem

**AGORA (corrigido):**
- Pagou no **último dia do mês** → acesso até último dia do **PRÓXIMO** mês 🎯
- Pagou em **qualquer outro dia** → acesso só até o fim do **MÊS ATUAL**

Isso incentiva o barbeiro a pagar **sempre no último dia do mês** pra garantir o mês inteiro seguinte.
