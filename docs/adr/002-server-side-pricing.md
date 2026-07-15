# ADR-002: Preço calculado server-side via RPC

**Status:** Aceito  
**Data:** 2026-01-20  
**Decisor:** Elberth Mayan

## Contexto

O sistema de agendamento calcula preços baseado em serviços selecionados, planos de mensalista e cupons de desconto. O preço é um dado crítico que não pode ser manipulado pelo client.

## Decisão

Calcular preços 100% server-side via PostgreSQL RPC functions (`criar_agendamento`, `criar_agendamento_rate_limited`).

## Justificativa

- **Segurança**: Impossível manipular preço pelo browser (DEV tools, interceptação de requests)
- **Integridade**: Preço sempre consistente com os serviços cadastrados no banco
- **Mensalista**: Desconto aplicado automaticamente se cliente tem plano ativo
- **Cupons**: Validação e aplicação atômica com `FOR UPDATE` (previne race condition)
- **Auditável**: Cálculo registrado no banco com todos os fatores

## Fluxo

```
Client envia service_ids → RPC busca preços no DB →
RPC verifica mensalista → RPC valida cupom →
RPC calcula preço final → Insere booking com preço correto
```

## Consequências

### Positivas
- Preço imutável pelo client
- Validação de negócio no banco (horário, almoço, limite diário)
- Rate limiting integrado na mesma RPC

### Negativas
- Mais complexidade no SQL
- Debug mais difícil (erros em PL/pgSQL)
- Testes requerem mock do Supabase
