@echo off
chcp 65001 >nul
echo ========================================
echo 本地开发环境启动脚本
echo ========================================
echo.

REM 设置开发环境变量
set NODE_ENV=development
set API_BASE_URL=http://localhost:4001

echo [信息] 环境变量已设置
echo   NODE_ENV: %NODE_ENV%
echo   API_BASE_URL: %API_BASE_URL%
echo.

echo ========================================
echo 重要提示
echo ========================================
echo.
echo 请确保已完成以下步骤：
echo.
echo [1] 在另一个终端窗口启动本地 API Server
echo     命令: node temp-api-server.js
echo     地址: http://localhost:4001
echo.
echo [2] API Server 启动成功后，按任意键继续...
echo.
pause

echo.
echo ========================================
echo 正在启动 Electron 客户端...
echo ========================================
echo.

REM 启动 Electron（开发模式，带 DevTools）
npm run dev

echo.
echo ========================================
echo 客户端已关闭
echo ========================================
echo.
pause
