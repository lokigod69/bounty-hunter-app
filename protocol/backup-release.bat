@echo off
cd /d "%~dp0.."
echo This makes a private schema and permissions backup. It does not apply SQL.
echo The database password prompt is hidden. Do not paste a password into chat.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prod\backup_schema.ps1
pause
