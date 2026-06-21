# 💎 BLACK DIAMOND - Sistema de Agendamento Premium

Este é um projeto de altíssimo nível desenvolvido para barbearias e estúdios que buscam uma presença digital de luxo, foco total na experiência do usuário (UX) e custo operacional zero de infraestrutura.

---

## 🚀 O Conceito: "Absolute Luxury"
O design foi construído sobre o conceito de **Quiet Luxury** (luxo silencioso). 
- **Paleta de Cores:** Fundo principal em `#0A0A0A` (Preto Grafite Profundo) com detalhes em `#B89B49` (Dourado Muted).
- **Tipografia:** Uso massivo de fontes Sans-Serif em negrito e itálico, com tracking (espaçamento) ajustado para um visual editorial gringo.
- **Interface:** Layout asimétrico, uso de máscaras de gradiente e efeito **Glassmorphism** (vidro fumê com desfoque de fundo) nos painéis de checkout.

---

## 🛠️ Stack Técnica (100% Grátis)
O projeto foi desenhado para ser lucrativo desde o dia 1, usando tecnologias de ponta com camadas gratuitas generosas:
- **Frontend:** React + TypeScript + Vite.
- **Estilização:** Tailwind CSS (Utilitário-first para máxima performance).
- **Animações:** Framer Motion (Transições fluidas e estados de drag).
- **Backend/Banco de Dados:** Supabase (PostgreSQL com Realtime).
- **Segurança:** RLS (Row Level Security) configurado no banco.

---

## 📋 Funcionalidades Principais

### 👤 Área do Cliente (`/agendar`)
- **Slider de Datas Premium:** Sistema de navegação "Grab & Slide" (arrastar com o mouse/dedo) com momentum fluido.
- **Seleção de Serviços:** Cards interativos com feedback visual imediato.
- **Checkout Inteligente:** Resumo dinâmico que calcula o valor total em tempo real com tipografia de impacto.
- **Integração Google Calendar:** Botão automático para o cliente salvar o agendamento na agenda do celular (reduz faltas).
- **Confirmação via WhatsApp:** Redirecionamento com ticket de reserva formatado profissionalmente.

### 🧔 Área do Barbeiro (Admin)
- **Dashboard Semanal:** Visão estratégica da agenda, separando horários ocupados de "Janelas de Oportunidade".
- **Lançamento Elite:** Tela de agendamento manual que espelha o luxo da tela do cliente, mas com busca instantânea na base de dados de clientes.
- **Gestão de Clientes:** Cadastro e histórico simplificado.
- **Faturamento Automatizado:** View SQL (`faturamento_diario`) preparada para relatórios de lucro.

---

## 🧠 O "Cérebro" (Back-end e Regras de Negócio)
Toda a inteligência reside no Supabase, garantindo que o site seja rápido e seguro:
1. **Trava de Conflito:** O banco de dados possui um índice único que impede que dois clientes agendem o mesmo horário simultaneamente.
2. **Segurança de Dados:** RLS ativado para que visitantes não consigam apagar ou ver dados sensíveis.
3. **Persistência:** Clientes são vinculados automaticamente pelo número de WhatsApp, criando um histórico de fidelização.

---

## 💰 Notas para o Desenvolvedor (Business Model)
Este projeto foi estruturado para que o desenvolvedor tenha **lucro máximo**:
- **Custo de Hospedagem:** R$ 0,00 (Vercel/Netlify).
- **Custo de Banco de Dados:** R$ 0,00 (Supabase Free Tier).
- **O que cobrar do cliente:** Valor do desenvolvimento (Puta site de luxo) + Compra do Domínio anual. 
- **Manutenção:** Mínima, devido à estabilidade das ferramentas escolhidas.

---

## 🛠️ Como rodar o projeto

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o `.env`:**
   Crie um arquivo `.env` na raiz com suas chaves do Supabase:
   ```env
   VITE_SUPABASE_URL=seu_url
   VITE_SUPABASE_ANON_KEY=sua_chave_anon
   ```

3. **Configure o Banco de Dados:**
   Execute os scripts SQL `supabase_schema.sql` e `supabase_backend_pro.sql` no SQL Editor do seu painel Supabase.

4. **Inicie o desenvolvimento:**
   ```bash
   npm run dev
   ```

---

## 💎 Próximos Passos Sugeridos
- [ ] Implementar Notificações Push via navegador.
- [ ] Conectar API de WhatsApp (Evolution API) para lembretes automáticos 2h antes.
- [ ] Adicionar gráfico de faturamento mensal no Dashboard.

---
*Desenvolvido com foco em Luxo, Performance e Lucratividade.*