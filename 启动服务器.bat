@echo off
chcp 65001 >nul 2>&1
title 民兰校途服务器
cd /d "%~dp0"

echo ========================================
echo   民兰校途 - 启动服务器
echo ========================================
echo.

:: Kill any existing node process on port 3456
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3456 " ^| findstr "LISTENING"') do (
    echo 停止旧服务器进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo 正在启动服务器...
echo.
echo 启动后请在浏览器打开: http://localhost:3456
echo.
echo 按 Ctrl+C 可停止服务器
echo ========================================
echo.

node server.js

pause
