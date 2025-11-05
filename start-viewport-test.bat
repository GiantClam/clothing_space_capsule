@echo off
echo ========================================
echo 1080x1920 竖屏测试启动器
echo ========================================
echo.
echo 正在启动测试页面...
start test-viewport.html
echo.
echo 测试页面已打开，请按照以下步骤操作：
echo.
echo 1. 调整浏览器窗口大小到 1080 x 1920
echo 2. 或者按 F12 打开开发者工具
echo 3. 点击设备模拟图标（手机图标）
echo 4. 选择自定义设备，设置宽度1080，高度1920
echo.
echo 准备启动主程序...
timeout /t 3 /nobreak > nul
echo.
echo 正在启动主程序...
npm start
