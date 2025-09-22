@echo off
setlocal

echo 🚀 开始部署到腾讯云...

REM 设置环境变量
set NODE_ENV=production
set PORT=4001

REM 进入api-server目录
cd /d %~dp0..
echo 当前目录: %cd%

REM 安装生产环境依赖
echo 📦 安装生产环境依赖...
call npm ci --only=production
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    exit /b 1
)

REM 生成Prisma客户端
echo 🔧 生成Prisma客户端...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Prisma客户端生成失败
    exit /b 1
)

REM 运行数据库迁移
echo 📊 运行数据库迁移...
call npx prisma migrate deploy
if %errorlevel% neq 0 (
    echo ❌ 数据库迁移失败
    exit /b 1
)

REM 启动应用（使用PM2管理）
echo 🚀 启动应用...
call npm run pm2:start
if %errorlevel% neq 0 (
    echo ❌ 应用启动失败
    exit /b 1
)

echo ✅ 部署完成！应用已在端口 4001 上运行
echo 查看应用状态: pm2 list
echo 查看日志: pm2 logs
echo 应用查看: http://localhost:4001/health

pause