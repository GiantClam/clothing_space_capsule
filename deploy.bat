@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 开始部署服装空间胶囊系统...

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未安装，请先安装 Docker Desktop
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose 未安装，请先安装 Docker Compose
    pause
    exit /b 1
)

REM 检查环境变量文件
if not exist .env (
    echo ⚠️  未找到 .env 文件，从示例文件创建...
    copy env.example .env
    echo 📝 请编辑 .env 文件，配置必要的环境变量
    echo 🔧 特别是以下配置项：
    echo    - JWT_SECRET: 用于 JWT 签名的密钥
    echo    - WECHAT_APP_ID: 微信公众号 AppID
    echo    - WECHAT_APP_SECRET: 微信公众号 AppSecret
    echo    - RUNNINGHUB_API_KEY: RunningHub API 密钥
    echo    - COS_SECRET_ID: 腾讯云 COS SecretID
    echo    - COS_SECRET_KEY: 腾讯云 COS SecretKey
    echo.
    pause
)

REM 停止现有服务
echo 🛑 停止现有服务...
docker-compose down

REM 构建镜像
echo 🔨 构建 Docker 镜像...
docker-compose build

REM 启动服务
echo 🚀 启动服务...
docker-compose up -d

REM 等待数据库启动
echo ⏳ 等待数据库启动...
timeout /t 10 /nobreak >nul

REM 运行数据库迁移
echo 📊 运行数据库迁移...
docker-compose exec api-server npm run db:migrate

REM 填充示例数据
echo 🌱 填充示例数据...
docker-compose exec api-server npm run db:seed

REM 检查服务状态
echo 🔍 检查服务状态...
docker-compose ps

echo.
echo ✅ 部署完成！
echo.
echo 📋 服务信息：
echo    - API Server: http://localhost:3001
echo    - 本地服务器: http://localhost:3000
echo    - 数据库: localhost:5432
echo    - Redis: localhost:6379
echo.
echo 🔧 管理命令：
echo    - 查看日志: docker-compose logs -f
echo    - 停止服务: docker-compose down
echo    - 重启服务: docker-compose restart
echo    - 进入容器: docker-compose exec api-server bash
echo.
echo 📱 客户端配置：
echo    - 确保客户端配置中的 API Server 地址为: http://localhost:3001
echo    - 确保客户端配置中的本地服务器地址为: http://localhost:3000
echo.
echo 🎉 系统已准备就绪，可以开始使用！
pause
