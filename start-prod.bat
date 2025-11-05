@echo off
echo ========================================
echo 生产模式 - 原始尺寸
echo ========================================
echo.
echo 窗口尺寸: 1080x1920 (原始尺寸)
echo 适合: 实际1080x1920屏幕或大屏幕测试
echo.
echo 正在启动...
echo.

REM 设置环境变量
set NODE_ENV=production

REM 验证环境变量设置
echo 当前 NODE_ENV=%NODE_ENV%
echo.

REM 使用 cross-env 确保环境变量传递
call npm start
