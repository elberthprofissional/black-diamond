# Launcher de desenvolvimento (Windows)

O `start-dev.ps1` é um launcher local: verifica Node, checa o `.env`,
instala dependências se necessário, sobe o Vite em `http://localhost:5173`,
abre o navegador e mantém o processo rodando até que você pressione ENTER.

## Executar

```powershell
.\launcher\start-dev.ps1
```

## Gerar o .exe (atalho de desenvolvedor)

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
Install-Module -Name PS2EXE -Scope CurrentUser -Force
Invoke-PS2EXE .\launcher\start-dev.ps1 .\BlackDiamondDev.exe -noConsole
```

> O `.exe` é UMA FERRAMENTA DE DESENVOLVIMENTO. Ele não roda em produção,
> não embute credenciais do Supabase e funciona apenas com um projeto já
> configurado localmente (`.env` presente).

## Comandos úteis

```powershell
npm run dev            # sobe o frontend (equivalente ao launcher, sem automações)
npm run launch         # atalho para o launcher
```