# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [3.2.0] - 2026-07-04

### Added
- Rate limiting no login (5 tentativas, bloqueio de 15 minutos)
- Audit logs para ações críticas (login, logout, agendamentos, clientes)
- Tabela `audit_logs` no banco de dados
- Testes E2E com Playwright
- Configuração Prettier para formatação consistente
- Husky + lint-staged para prevenir commits sujos
- Skeleton loading no AdminWeekly

### Changed
- ESLint com regras mais rigorosas
- README com badges de status e guia rápido
- PWA agora só abre nas rotas `/admin` (scope ajustado)
- Mensagem WhatsApp pro barbeiro enviada antes do Google Calendar

### Fixed
- WhatsApp pro barbeiro não abria quando cliente escolhia "Quero ser lembrado"
- Ordem de abertura de pop-ups corrigida (WhatsApp primeiro, Google Calendar depois)

### Security
- Validação de rate limit em tentativas de login
- Registro de ações administrativas para auditoria

## [3.1.0] - 2026-07-03

### Added
- Skeleton loading em páginas admin
- Sistema de mensalista (serviços, dias, promoção)
- WhatsApp automático pós-agendamento
- Perfil com foto e bio
- Configurações estilo Instagram
- Telefone do barbeiro configurável
- 34 novos testes unitários

### Changed
- Layout minimalista nas configurações
- Booking separado Desktop/Mobile
- Context dinâmico para dados do barbeiro

### Fixed
- WhatsApp não abria no iOS
- Telefone mostrava valor da env var quando banco vazio
- Diversos fixes de UX e performance

## [3.0.0] - 2026-07-01

### Added
- Sistema de agendamento completo
- Painel admin com dashboard
- Gestão de clientes
- Sistema de serviços
- Bloqueio de horários
- Reagendamento
- Push notifications
- PWA completo

### Architecture
- React 19 + TypeScript 6
- Vite 8 + Tailwind CSS 4
- Supabase (PostgreSQL + RLS + Auth)
- Framer Motion para animações
- Vitest para testes
