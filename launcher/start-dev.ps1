# =====================================================================
# BLACK DIAMOND — Launcher de desenvolvimento (Windows)
#
# Verifica o ambiente, instala dependências se necessário, inicia o
# servidor Vite, abre o navegador e mantém tudo rodando até que você
# pressione ENTER para encerrar.
#
#   1. Abrir a raiz do projeto.
#   2. Executar: .\launcher\start-dev.ps1
#
# Para gerar um .exe (opcional) e usá-lo como atalho de dev:
#   Install-Module -Name PS2EXE -Scope CurrentUser -Force
#   Invoke-PS2EXE .\launcher\start-dev.ps1 .\BlackDiamondDev.exe -noConsole
#
# ATENÇÃO: isso é um LAUNCHER de desenvolvimento local. Ele NÃO é um
# servidor de produção e não embute nenhuma credencial Supabase.
# =====================================================================

param(
    [string]$AdminUrl = "http://localhost:5173"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "  == $msg" -ForegroundColor Cyan
}

function Test-Command([string]$name, [string]$args) {
    try {
        $null = & $name $args 2>$null
        return $LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor DarkGray
Write-Host "  BLACK DIAMOND - Launcher de desenvolvimento" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor DarkGray

# ------------------------------------------------------------------
# 1. Node / npm
# ------------------------------------------------------------------
Write-Step "Verificando Node.js..."
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  [!] Node.js não encontrado." -ForegroundColor Red
    Write-Host "  Instale Node.js 18+ em https://nodejs.org e tente novamente." -ForegroundColor Yellow
    exit 1
}
$nodeVersion = node --version
Write-Host "  Node $nodeVersion"

# ------------------------------------------------------------------
# 2. Arquivo .env
# ------------------------------------------------------------------
Write-Step "Configuração (.env)..."
$envFile = Join-Path $ProjectRoot ".env.example"
$envReal = Join-Path $ProjectRoot ".env"
if (Test-Path $envReal) {
    Write-Host "  .env encontrado."
} else {
    Write-Host "  [!] .env não existe. Crie um a partir de .env.example"
    Write-Host "      (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)." -ForegroundColor Yellow
    Write-Host "      O app precisará dessas chaves para conectar no backend." -ForegroundColor Yellow
}

# ------------------------------------------------------------------
# 3. Dependências
# ------------------------------------------------------------------
Write-Step "Dependências (npm)..."
$deps = Join-Path $ProjectRoot "node_modules"
if (-not (Test-Path $deps)) {
    Write-Host "  node_modules ausente. Instalando dependências (pode demorar)..."
    Push-Location $ProjectRoot
    npm install
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Host "  [!] Falha no npm install." -ForegroundColor Red
        exit 1
    }
    Pop-Location
} else {
    Write-Host "  node_modules presente."
}

# ------------------------------------------------------------------
# 4. Inicia o Vite em background
# ------------------------------------------------------------------
Write-Step "Iniciando servidor local..."
Push-Location $ProjectRoot
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev > .vite-dev.log 2>&1" -PassThru -WindowStyle Hidden
Pop-Location
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "  > Servidor iniciado." -ForegroundColor Green
Write-Host "  > Local: $AdminUrl" -ForegroundColor Green
Start-Process $AdminUrl

Write-Host ""
Write-Host "  Pressione ENTER para encerrar o servidor de desenvolvimento."
Write-Host "==============================================" -ForegroundColor DarkGray

try {
    # Mantém o launcher rodando, mostrando o log em tempo real.
    $envLog = Join-Path $ProjectRoot ".vite-dev.log"
    $footer = $true
    while ($true) {
        if ([Console]::KeyAvailable) {
            # apenas aguarda ENTER
            $null = [Console]::ReadKey()
            break
        }
        if (Test-Path $envLog) {
            $content = Get-Content $envLog -Tail 3 -ErrorAction SilentlyContinue
            if ($content -and $footer) {
                Write-Host ""
                foreach ($line in $content) { Write-Host "  $line" -ForegroundColor DarkGray }
                $footer = $false
            }
        }
        Start-Sleep -Milliseconds 500
    }
} finally {
    if ($proc -and -not $proc.HasExited) {
        Write-Host ""
        Write-Host "  Encerrando servidor..."
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        Get-Process -Name node -ErrorAction SilentlyContinue |
            Where-Object { $_.MainWindowTitle -eq "" } |
            Stop-Process -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  Servidor encerrado. Até logo!" -ForegroundColor Green
}