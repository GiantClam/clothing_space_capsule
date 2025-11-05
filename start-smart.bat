@echo off
echo ========================================
echo 智能启动 - 自动适配屏幕尺寸
echo ========================================
echo.

:: 获取屏幕分辨率信息
for /f "tokens=2 delims=:" %%i in ('wmic path Win32_VideoController get CurrentHorizontalResolution /value ^| find "="') do set screen_width=%%i
for /f "tokens=2 delims=:" %%i in ('wmic path Win32_VideoController get CurrentVerticalResolution /value ^| find "="') do set screen_height=%%i

echo 检测到屏幕分辨率: %screen_width%x%screen_height%
echo.

:: 判断是否需要缩放
if %screen_width% GTR 2000 (
    echo 检测到大屏幕，使用缩放模式...
    echo 窗口尺寸: 648x1152 (60%% 缩放)
    echo.
    npm start -- --scale
) else (
    echo 使用原始尺寸模式...
    echo 窗口尺寸: 1080x1920 (原始尺寸)
    echo.
    npm start
)

echo.
echo 提示: 
echo - 缩放模式适合开发调试
echo - 原始模式适合最终测试
echo - 可以手动选择: start-dev-scaled.bat 或 start-prod.bat
