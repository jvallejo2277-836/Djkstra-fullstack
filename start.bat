@echo off
title Dijkstra Visualizer - Startup
color 0A

echo ========================================
echo    DIJKSTRA ALGORITHM VISUALIZER
echo ========================================
echo.
echo Iniciando servicios...
echo.

echo [1/2] Iniciando Backend Django...
echo      URL: http://127.0.0.1:8000
start "Django Backend" cmd /k "cd backend && python manage.py runserver"

echo.
echo Esperando que el backend inicie...
timeout /t 5 /nobreak >nul

echo.
echo [2/2] Iniciando Frontend React...
echo      URL: http://localhost:3000
start "React Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo    SERVICIOS INICIANDO...
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://127.0.0.1:8000
echo Admin:    http://127.0.0.1:8000/admin
echo.
echo Presiona cualquier tecla para cerrar esta ventana
echo (Los servicios seguiran ejecutandose)
echo ========================================
pause >nul