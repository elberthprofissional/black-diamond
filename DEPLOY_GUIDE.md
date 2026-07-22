# Guia de Deploy — Sistema de Agendamento para Barbearias

> Passo a passo completo para criar uma nova instancia do sistema para uma barbearia parceira.

---

---

## Instalacao Manual (alternativa)

Se preferir fazer manualmente, siga os passos abaixo.

## Pre-requisitos

Antes de comecar, tenha em maos:

- Conta no Supabase (gratuita)
- Conta no Vercel (gratuita, conectada ao GitHub)
- Repositorio no GitHub com o codigo-fonte do sistema
- Dominio da barbearia (opcional)
- Dados da barbearia: nome, WhatsApp, endereco, Instagram, logo, fotos

---

## 1️⃣ Supabase — Criar o Banco

### Passo 1.1 — Criar projeto

1. Acesse [app.supabase.com](https://app.supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `sistema-barbearia-nome` (ex: `sistema-barbearia-joao`)
   - **Database Password:** Crie uma senha segura e **anote**
   - **Region:** Escolha a mais próxima da barbearia (ex: South America - São Paulo)
4. Clique **"Create new project"** e aguarde ~2 minutos

### Passo 1.2 — Pegar as credenciais

1. No menu lateral, clique em **"Project Settings"** (ícone de engrenagem)
2. Em **"Configuration" > "API"**
3. Anote:
   - **Project URL** (ex: `https://abcdefghijklm.supabase.co`)
   - **anon public key** (uma string longa começando com `eyJ...`)

### Passo 1.3 — Rodar o SQL

1. No menu lateral, clique em **"SQL Editor"**
2. Clique **"New Query"**
3. Abra o arquivo `supabase/universal.sql` do projeto
4. Copie todo o conteúdo e cole no editor
5. Clique **"Run"** (▶️)
6. Aguarde todas as queries executarem (deve aparecer "Success")

### Passo 1.4 — Criar usuário admin

1. No menu lateral, clique em **"Authentication" > "Users"**
2. Clique **"Add User"**
3. Preencha:
   - **Email:** email do barbeiro (ex: `joao@email.com`)
   - **Password:** uma senha (o barbeiro pode mudar depois)
4. Clique **"Add User"**
5. Pronto — o admin já pode fazer login.

---

## 2️⃣ Código — Editar Dados da Barbearia

### Arquivos que precisam ser alterados:

Arquivo | O que mudar
--------|-------------
`src/components/Location.tsx` | Iframe do Google Maps + endereço
`src/components/Footer.tsx` | Endereço + Instagram

### 📍 Location.tsx — Mapa e Endereço

```tsx
// LINHA ~35 — Iframe do Google Maps
// Substitua a URL do iframe pelo mapa da barbearia
src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!..."

// LINHA ~66 — Endereço
<p className="text-zinc-400 ...">
  Av. Exemplo, 123              ← MUDAR AQUI (endereço da barbearia)
  <br />
  Bairro, Cidade - UF           ← MUDAR AQUI
```

**Como gerar o iframe do Google Maps:**
1. Abra o Google Maps e pesquise o endereço da barbearia
2. Clique em **"Compartilhar"** > **"Incorporar um mapa"**
3. Copie o código `src="..."` (só a URL, não a tag inteira)
4. Cole na linha do `src` do iframe

### 🦶 Footer.tsx — Redes Sociais

```tsx
// LINHA ~87 — Instagram
href="https://www.instagram.com/nome.da.barbearia/"  ← MUDAR AQUI

// LINHA ~146 — Endereço
Av. Exemplo, 123, Bairro, Cidade  ← MUDAR AQUI
```

### 📝 Checklist completo de edição

- [ ] `src/components/Location.tsx` — iframe do Maps
- [ ] `src/components/Location.tsx` — endereço
- [ ] `src/components/Footer.tsx` — Instagram
- [ ] `src/components/Footer.tsx` — endereço
- [ ] (Opcional) `src/components/Hero.tsx` — imagem de fundo
- [ ] (Opcional) Trocar imagens em `/public/assets/`: logo, hero, foto do barbeiro

**Dica:** Use Ctrl+F (Find) pra localizar rapidamente cada trecho. São ~10 linhas no total pra mudar.

---

## 3️⃣ Vercel — Fazer o Deploy

### Passo 3.1 — Conectar com GitHub

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Na dashboard, clique **"Add New..." > "Project"**
3. Selecione o repositório do sistema
4. Clique **"Import"**

### Passo 3.2 — Configurar variáveis de ambiente

Na tela "Configure Project", role até **"Environment Variables"** e adicione:

```
Name:  VITE_SUPABASE_URL
Value: https://seu-projeto.supabase.co     ← A URL que você anotou no Passo 1.2

Name:  VITE_SUPABASE_ANON_KEY
Value: eyJ...                              ← A chave que você anotou no Passo 1.2

Name:  VITE_BARBER_WHATSAPP
Value: 5531999999999                       ← Numero WhatsApp do barbeiro (codigo do pais + DDD + numero)

Name:  VITE_VAPID_PUBLIC_KEY
Value: BLxxx...                           ← Chave publica VAPID (para notificacoes push)

Name:  VITE_SENTRY_DSN
Value: https://xxx@sentry.io/xxx           ← DSN do Sentry (opcional, para error reporting)
```

### Passo 3.3 — Deploy

1. Clique **"Deploy"**
2. Aguarde ~2 minutos
3. Pronto! O Vercel vai te dar uma URL temporária (ex: `projeto.vercel.app`)

### Passo 3.4 — Configurar domínio personalizado

1. No projeto no Vercel, vá em **"Settings" > "Domains"**
2. Digite o domínio da barbearia (ex: `barbeariadofulano.com.br`)
3. Clique **"Add"**
4. Siga as instruções para apontar o DNS do domínio para a Vercel
5. Pronto — site no ar com domínio próprio!

---

## 4️⃣ Final — Barbeiro Configura o Painel

Pronto, o sistema já está no ar! Agora o barbeiro configura o resto **sozinho**:

1. Acesse `https://barbeariadofulano.com.br/admin`
2. Faça login com o email/senha que você criou
3. Vá em **"Perfil"** e configure:
   - Nome do barbeiro
   - Número do WhatsApp
   - Foto de perfil
   - Bio e frase de efeito
   - Instagram
4. Vá em **"Serviços"** e cadastre os serviços com preços
5. Vá em **"Horários"** e configure dias e horários de funcionamento
6. Vá em **"Galeria"** e adicione as fotos do portfólio

---

## 💰 Custo por Barbearia

| Item | Custo | Quem paga |
|------|-------|-----------|
| Vercel (Hospedagem) | **GRÁTIS** | — |
| Supabase (Banco) | **GRÁTIS** | — |
| Domínio (.com.br) | ~R$40/ano | Barbeiro |
| **Seu trabalho** | **~30 min** | Você cobra |
| **Total pra você** | **ZERO** | |

---

---

## 🔄 Quick Reference (atalho mental)

```
Supabase:
  New Project → Anotar URL + Key → SQL Editor → Rodar universal.sql → Auth > Add User

Código:
  Location.tsx (iframe + endereço) → Footer.tsx (Instagram + endereço)

Vercel:
  Add New Project → Importar repo → Colocar env vars (URL + Key + Email) → Deploy → Domínio

Barbeiro:
  Logar → Configurar nome, WhatsApp, foto, serviços, horários, galeria
```

---

## 🎨 Personalização Visual

Para deixar o sistema com a cara da barbearia:

| O que | Onde | Como |
|-------|------|------|
| **Logo** | `/public/assets/logo.webp` | Substituir o arquivo |
| **Foto do Hero** | `/public/assets/hero-bg.webp` | Substituir o arquivo |
| **Foto do barbeiro** | `/public/assets/logo.webp` | Substituir o arquivo (ou fazer upload pelo painel) |
| **Cores** | `src/index.css` | Ajustar as variáveis `--color-gold`, `--color-gold-bright` |
| **Favicon** | `/public/favicon.ico` | Substituir o arquivo |

---

> **Dica final:** Na primeira vez, leva uns 30 minutos. Na segunda, você faz em 15. Na terceira, em 10. Depois da quarta, é sopa. ☕🔥
