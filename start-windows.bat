@echo off
cd /d "%~dp0"
echo =====================================
echo       ExamPDF Pro - Local Start
echo =====================================
if not exist node_modules (
  echo Installing project packages...
  call npm install
  if errorlevel 1 (echo Install failed. Check internet/npm. & pause & exit /b 1)
)
echo Opening local website...
start "ExamPDF Pro" http://localhost:5173
call npm run dev
pause
