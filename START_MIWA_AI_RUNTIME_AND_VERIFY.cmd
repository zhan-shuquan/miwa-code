@echo off
setlocal EnableExtensions
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_MIWA_AI_RUNTIME_AND_VERIFY.ps1"
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
