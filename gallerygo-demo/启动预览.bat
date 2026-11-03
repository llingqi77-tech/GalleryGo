@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 start-preview.py
) else (
  python start-preview.py
)
pause
