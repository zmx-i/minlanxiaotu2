@echo off
chcp 65001 >nul
title 民兰校途 - 后台管理系统启动器
color 0A

echo ================================================
echo      民兰校途 - 后台管理系统启动器 v1.0
echo ================================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址：https://nodejs.org/ (建议 v18 或更高版本)
    pause
    exit /b
)

echo [信息] Node.js 版本:
node -v
echo.

:: 检查依赖
if not exist "node_modules" (
    echo [信息] 正在安装依赖...
    call npm install express cors
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络连接
        pause
        exit /b
    )
    echo [信息] 依赖安装成功
)

:: 检查必要文件
if not exist "server-admin.js" (
    echo [错误] 找不到 server-admin.js 文件
    pause
    exit /b
)

echo.
echo ================================================
echo  启动服务...
echo ================================================
echo.
echo  管理后台: http://localhost:3456/admin.html
echo  司机端:   http://localhost:3456/driver.html
echo  API 健康: http://localhost:3456/api/health
echo.
echo  按 Ctrl+C 停止服务
echo ================================================
echo.

:: 启动服务器
node server-admin.js

:: 如果服务器退出，暂停
echo.
echo [信息] 服务器已停止
pause