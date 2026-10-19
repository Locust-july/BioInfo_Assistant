@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto bundled
node scripts\start-design-preview.mjs
goto done
:bundled
"%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\start-design-preview.mjs
:done
if errorlevel 1 pause
