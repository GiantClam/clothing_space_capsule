@echo off
setlocal enabledelayedexpansion

echo ==================================================
echo 服装空间胶囊 API 服务器 - 宝塔面板部署脚本
echo ==================================================

REM 检查是否以管理员权限运行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误: 此脚本需要管理员权限运行
    echo 请右键点击此批处理文件，选择"以管理员身份运行"
    pause
    exit /b 1
)

echo 🚀 开始宝塔面板部署...

REM 设置项目目录
set PROJECT_DIR=C:\www\wwwroot\clothing-api
set LOG_DIR=C:\www\wwwroot\clothing-api\logs

REM 检查Node.js和npm是否已安装
echo 🔍 检查Node.js和npm...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误: 未找到npm，请先安装Node.js和npm
    pause
    exit /b 1
)

echo ✅ Node.js和npm已安装

REM 检查Docker是否已安装
echo 🔍 检查Docker...
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo 警告: 未找到Docker，将跳过Docker相关部署步骤
    set DOCKER_AVAILABLE=0
) else (
    echo ✅ Docker已安装
    set DOCKER_AVAILABLE=1
)

REM 创建项目目录
echo 📁 创建项目目录...
if not exist "%PROJECT_DIR%" (
    mkdir "%PROJECT_DIR%"
    if %errorLevel% neq 0 (
        echo 错误: 无法创建目录 %PROJECT_DIR%
        pause
        exit /b 1
    )
)

if not exist "%LOG_DIR%" (
    mkdir "%LOG_DIR%"
    if %errorLevel% neq 0 (
        echo 错误: 无法创建日志目录 %LOG_DIR%
        pause
        exit /b 1
    )
)

REM 复制项目文件
echo 📦 复制项目文件...
xcopy "..\*" "%PROJECT_DIR%" /E /I /H /Y >nul
if %errorLevel% neq 0 (
    echo 警告: 文件复制过程中出现错误，请检查权限
)

REM 进入项目目录
cd /d "%PROJECT_DIR%"

REM 设置权限 (在Windows上这一步可能需要管理员权限)
echo 🔧 设置文件权限...
icacls "%PROJECT_DIR%" /grant Users:(OI)(CI)F /T >nul 2>&1

REM 检查package.json是否存在
if not exist "package.json" (
    echo 错误: 未找到package.json文件，请确保在正确的目录中运行此脚本
    pause
    exit /b 1
)

REM 安装依赖
echo 🔧 安装生产环境依赖...
npm ci --only=production
if %errorLevel% neq 0 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)

REM 生成Prisma客户端
echo 🔨 生成Prisma客户端...
npx prisma generate
if %errorLevel% neq 0 (
    echo 错误: Prisma客户端生成失败
    pause
    exit /b 1
)

REM 创建PM2配置
echo 📝 创建PM2配置文件...
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

REM 检查PM2是否已安装
echo 🔍 检查PM2...
npm list -g pm2 >nul 2>&1
if %errorLevel% neq 0 (
    echo 🔧 安装PM2...
    npm install -g pm2
    if %errorLevel% neq 0 (
        echo 错误: PM2安装失败
        pause
        exit /b 1
    )
)

REM 如果Docker可用，则启动Docker服务
if "%DOCKER_AVAILABLE%"=="1" (
    echo 🐳 启动Docker服务...
    docker-compose -f deploy/docker-compose.baota.yml up -d
    if %errorLevel% neq 0 (
        echo 警告: Docker服务启动失败，请手动检查docker-compose.baota.yml配置
    ) else (
        echo ✅ Docker服务已启动
        echo 等待数据库启动完成...
        timeout /t 30 /nobreak >nul
        
        REM 检查数据库是否已初始化
        echo 🔍 检查数据库初始化状态...
        docker-compose -f deploy/docker-compose.baota.yml exec db pg_isready -U postgres -d clothing_capsule_db >nul 2>&1
        if %errorLevel% neq 0 (
            echo ❌ 数据库连接失败，等待更长时间...
            timeout /t 30 /nobreak >nul
        )
        
        REM 运行数据库迁移
        echo 📦 运行数据库迁移...
        docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate deploy
        if %errorLevel% neq 0 (
            echo 警告: 数据库迁移失败，尝试手动初始化...
            REM 如果迁移失败，尝试重新初始化
            docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate reset --force
            docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate deploy
        )
        
        REM 运行种子数据
        echo 🌱 导入种子数据...
        docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma db seed
        if %errorLevel% neq 0 (
            echo 警告: 种子数据导入失败
        ) else (
            echo ✅ 数据库初始化完成
        )
    )
) else (
    echo ⚠️  Docker不可用，跳过数据库自动初始化
    echo 请手动创建PostgreSQL数据库并运行以下命令:
    echo 1. 创建数据库: createdb -U postgres clothing_capsule_db
    echo 2. 运行迁移: npx prisma migrate deploy
    echo 3. 导入种子数据: npx prisma db seed
)

REM 启动应用
echo 🚀 启动应用...
pm2 start ecosystem.config.js
if %errorLevel% neq 0 (
    echo 错误: 应用启动失败
    pause
    exit /b 1
)

pm2 save
if %errorLevel% neq 0 (
    echo 警告: PM2配置保存失败
)

echo.
echo ==================================================
echo ✅ 宝塔部署完成！
echo ==================================================
echo.
echo 查看应用状态: pm2 status
echo 查看日志: pm2 logs
echo 应用健康检查: http://localhost:4001/health
echo.
echo 请确保已配置环境变量文件 .env.production
echo 可以复制 deploy\.env.baota.example 为 .env.production 并填写实际值
echo.
echo 如果使用Docker部署，请确保Docker服务正常运行:
echo docker-compose -f deploy/docker-compose.baota.yml ps
echo.
echo 数据库初始化说明:
echo - 如果是首次部署，数据库会自动创建表结构和种子数据
echo - 如果需要重新初始化数据库，请运行:
echo   docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate reset --force
echo.
pause