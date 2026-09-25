@echo off
chcp 65001 >nul
title ProLink - servidor local
cd /d "%~dp0"

echo.
echo   Abrindo o ProLink por um servidor local...
echo   (o duplo clique no index.html tambem funciona; use este atalho
echo    se alguma API recusar requisicoes de origem nula)
echo.

set "PORTA=8000"
set "CMD="

where py >nul 2>&1 && set "CMD=py -3 -m http.server %PORTA%"
if not defined CMD where python >nul 2>&1 && set "CMD=python -m http.server %PORTA%"
if not defined CMD where php >nul 2>&1 && set "CMD=php -S localhost:%PORTA%"

if not defined CMD (
    echo   Python e PHP nao encontrados: usando o servidor de reserva.
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
    goto :fim
)

start "" "http://localhost:%PORTA%/index.html"
echo   Rodando em http://localhost:%PORTA%
echo   Feche esta janela para encerrar.
echo.
%CMD%

:fim
pause
