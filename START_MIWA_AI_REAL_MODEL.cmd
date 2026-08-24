@echo off
setlocal
title AIONE MIWA AI REAL MODEL BACKEND
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_MIWA_AI_REAL_MODEL.ps1"
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" (
  echo [AIONE] Real-model Backend launcher exited with code %RC%.
  echo [AIONE] Keep this window open and send the last error lines for diagnosis.
) else (
  echo [AIONE] The Backend process has ended.
  echo [AIONE] If you intended to keep MIWA AI running, this is unexpected.
)
echo.
pause
endlocal & exit /b %RC%
