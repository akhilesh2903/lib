@echo off
title Aster Library LMS - Full Stack Launcher
echo ========================================================
echo Starting Aster College Library Management System
echo ========================================================

echo 1. Launching FastAPI Backend on http://localhost:8000 ...
start "Aster LMS Backend [Port 8000]" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 >nul

echo 2. Launching Next.js Frontend on http://localhost:3000 ...
start "Aster LMS Frontend [Port 3000]" cmd /k "cd /d %~dp0frontend && npm run dev"

echo ========================================================
echo System launched successfully!
echo Frontend: http://localhost:3000
echo Backend API Docs: http://localhost:8000/docs
echo ========================================================
