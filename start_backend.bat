@echo off
title Aster Library LMS - Backend Server
echo ========================================================
echo Starting Aster LMS FastAPI Backend on http://localhost:8000
echo ========================================================
cd /d "%~dp0backend"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
