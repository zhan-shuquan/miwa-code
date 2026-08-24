@echo off
setlocal EnableExtensions
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SETUP_NODE_LTS.ps1"
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
