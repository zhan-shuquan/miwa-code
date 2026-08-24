@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0VERIFY_MIWA_AI_REAL_MODEL.ps1"
set "RC=%ERRORLEVEL%"
pause
endlocal & exit /b %RC%
