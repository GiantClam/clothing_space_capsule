@echo off
setlocal enabledelayedexpansion

echo ==================================================
echo 服装空间胶囊 API 服务器 - 宝塔面板简化部署 (Windows)
echo ==================================================

REM 获取当前目录作为项目目录
set PROJECT_DIR=%cd%
set LOG_DIR=%PROJECT_DIR%\logs

echo 当前项目目录: %PROJECT_DIR%

REM 检查必要文件
if not exist "package.json" (
    echo 错误: 未找到package.json文件，请确保在项目根目录中运行此脚本
    exit /b 1
)

if not exist ".env.production" (
    echo 警告: 未找到.env.production文件，请确保已创建环境变量配置文件
    echo 可以复制 deploy\.env.baota.example 为 .env.production 并填写实际值
    echo.
)

REM 创建日志目录
if not exist "%LOG_DIR%" (
    echo 创建日志目录...
    mkdir "%LOG_DIR%"
)

REM 安装生产环境依赖
echo 安装生产环境依赖...
npm ci --only=production
if %errorLevel% neq 0 (
    echo 错误: 依赖安装失败
    exit /b 1
)

REM 生成Prisma客户端
echo 生成Prisma客户端...
npx prisma generate
if %errorLevel% neq 0 (
    echo 错误: Prisma客户端生成失败
    exit /b 1
)

REM 创建PM2配置（如果不存在）
if not exist "ecosystem.config.js" (
    echo 创建PM2配置文件...
    (
    echo module.exports = {
    echo   apps: [
    echo     {
    echo       name: 'clothing-space-capsule-api',
    echo       script: './src/app.js',
    echo       instances: 'max',
    echo       exec_mode: 'cluster',
    echo       watch: false,
    echo       max_memory_restart: '1G',
    echo       env: {
    echo         NODE_ENV: 'production',
    echo         PORT: 4001
    echo       },
    echo       error_file: './logs/pm2-err.log',
    echo       out_file: './logs/pm2-out.log',
    echo       log_file: './logs/pm2-combined.log',
    echo       time: true,
    echo       combine_logs: true,
    echo       merge_logs: true
    echo     }
    echo   ]
    echo };
    ) > ecosystem.config.js
)

REM 检查PM2是否已安装
echo 检查PM2...
npm list -g pm2 >nul 2>&1
if %errorLevel% neq 0 (
    echo 安装PM2...
    npm install -g pm2
    if %errorLevel% neq 0 (
        echo 错误: PM2安装失败
        exit /b 1
    )
)

REM 启动应用
echo 启动应用...
pm2 start ecosystem.config.js
if %errorLevel% neq 0 (
    echo 错误: 应用启动失败
    exit /b 1
)

pm2 save
if %errorLevel% neq 0 (
    echo 警告: PM2配置保存失败
)

echo.
echo ==================================================
echo ✅ 应用部署完成！
echo ==================================================
echo.
echo 查看应用状态: pm2 status
echo 查看日志: pm2 logs
echo 应用健康检查: http://localhost:4001/health
echo.
echo 如果需要使用Docker运行数据库等服务，请运行:
echo docker-compose -f deploy/docker-compose.baota.yml up -d
echo.