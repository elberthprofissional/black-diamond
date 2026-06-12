@echo off
title Iniciar BLACK DIAMOND
echo ==========================================
echo    INICIANDO PROJETO BLACK DIAMOND
echo ==========================================
echo.
echo [1/2] Instalando dependencias (caso necessario)...
call npm install
echo.
echo [2/2] Iniciando servidor de desenvolvimento...
echo O site abrira automaticamente em instantes.
echo.
start http://localhost:5173
npm run dev
pause
