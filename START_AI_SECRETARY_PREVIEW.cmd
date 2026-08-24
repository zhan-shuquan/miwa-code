@echo off
setlocal EnableExtensions
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_AI_SECRETARY_PREVIEW.ps1"
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
