@echo off
setlocal enabledelayedexpansion

echo ==================================================
echo 服装空间胶囊 API 服务器 - 数据库初始化脚本
echo ==================================================

REM 检查是否在项目目录中运行
if not exist "package.json" (
    echo 错误: 未找到package.json文件
    echo 请在项目根目录中运行此脚本
    pause
    exit /b 1
)

REM 检查Docker是否运行
echo 🔍 检查Docker服务状态...
docker-compose -f deploy/docker-compose.baota.yml ps | findstr "clothing-db" >nul
if %errorLevel% neq 0 (
    echo 错误: 数据库容器未运行
    echo 请先启动Docker服务:
    echo docker-compose -f deploy/docker-compose.baota.yml up -d db
    pause
    exit /b 1
)

echo ✅ 数据库容器正在运行

REM 等待数据库完全启动
echo 🕐 等待数据库启动完成...
timeout /t 10 /nobreak >nul

REM 检查数据库连接
echo 🔍 检查数据库连接...
docker-compose -f deploy/docker-compose.baota.yml exec db pg_isready -U postgres -d clothing_capsule_db >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ 数据库连接失败，再等待30秒...
    timeout /t 30 /nobreak >nul
    
    docker-compose -f deploy/docker-compose.baota.yml exec db pg_isready -U postgres -d clothing_capsule_db >nul 2>&1
    if %errorLevel% neq 0 (
        echo ❌ 数据库连接仍然失败
        echo 请检查数据库容器日志:
        echo docker-compose -f deploy/docker-compose.baota.yml logs db
        pause
        exit /b 1
    )
)

echo ✅ 数据库连接正常

REM 运行数据库迁移
echo 📦 运行数据库迁移...
docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate deploy
if %errorLevel% neq 0 (
    echo ❌ 数据库迁移失败
    echo 尝试重置数据库...
    
    REM 询问是否重置数据库
    echo.
    echo 警告: 这将删除所有现有数据!
    set /p RESET_DB=是否重置数据库? (y/N): 
    if /i "%RESET_DB%"=="y" (
        docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate reset --force
        if %errorLevel% neq 0 (
            echo ❌ 数据库重置失败
            pause
            exit /b 1
        )
        
        echo 📦 重新运行数据库迁移...
        docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate deploy
        if %errorLevel% neq 0 (
            echo ❌ 数据库迁移失败
            pause
            exit /b 1
        )
    ) else (
        echo 已取消数据库重置
        pause
        exit /b 1
    )
)

REM 运行种子数据
echo 🌱 导入种子数据...
docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma db seed
if %errorLevel% neq 0 (
    echo ❌ 种子数据导入失败
    pause
    exit /b 1
)

echo.
echo ==================================================
echo ✅ 数据库初始化完成！
echo ==================================================
echo.
echo 数据库信息:
echo - 数据库名称: clothing_capsule_db
echo - 数据库用户: postgres
echo - 数据库端口: 5432
echo.
echo 已创建的表:
echo - devices (设备信息)
echo - users (用户信息)
echo - categories (服装分类)
echo - clothes (服装信息)
echo - tasks (任务信息)
echo - wechat_messages (微信消息)
echo.
echo 已初始化的数据:
echo - 服装分类 (男装、女装、配饰及其子分类)
echo - 示例服装数据
echo.
pause