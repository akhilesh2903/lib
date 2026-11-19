@echo off
title Aster Library LMS - Frontend Web App
echo ========================================================
echo Starting Aster LMS Next.js Frontend on http://localhost:3000
echo ========================================================
cd /d "%~dp0frontend"
npm run dev
pause
