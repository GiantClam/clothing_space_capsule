#!/bin/bash

echo "=================================================="
echo "服装空间胶囊 API 服务器 - 数据库初始化脚本"
echo "=================================================="

# 检查是否在项目目录中运行
if [ ! -f "package.json" ]; then
    echo "错误: 未找到package.json文件"
    echo "请在项目根目录中运行此脚本"
    exit 1
fi

# 检查Docker是否运行
echo "🔍 检查Docker服务状态..."
if ! docker-compose -f deploy/docker-compose.baota.yml ps | grep -q "clothing-db"; then
    echo "错误: 数据库容器未运行"
    echo "请先启动Docker服务:"
    echo "docker-compose -f deploy/docker-compose.baota.yml up -d db"
    exit 1
fi

echo "✅ 数据库容器正在运行"

# 等待数据库完全启动
echo "🕐 等待数据库启动完成..."
sleep 10

# 检查数据库连接
echo "🔍 检查数据库连接..."
if ! docker-compose -f deploy/docker-compose.baota.yml exec db pg_isready -U postgres -d clothing_capsule_db > /dev/null 2>&1; then
    echo "❌ 数据库连接失败，再等待30秒..."
    sleep 30
    
    if ! docker-compose -f deploy/docker-compose.baota.yml exec db pg_isready -U postgres -d clothing_capsule_db > /dev/null 2>&1; then
        echo "❌ 数据库连接仍然失败"
        echo "请检查数据库容器日志:"
        echo "docker-compose -f deploy/docker-compose.baota.yml logs db"
        exit 1
    fi
fi

echo "✅ 数据库连接正常"

# 运行数据库迁移
echo "📦 运行数据库迁移..."
if ! docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate deploy; then
    echo "❌ 数据库迁移失败"
    echo "尝试重置数据库..."
    
    # 询问是否重置数据库
    echo
    echo "警告: 这将删除所有现有数据!"
    read -p "是否重置数据库? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate reset --force
        if [ $? -ne 0 ]; then
            echo "❌ 数据库重置失败"
            exit 1
        fi
        
        echo "📦 重新运行数据库迁移..."
        if ! docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate deploy; then
            echo "❌ 数据库迁移失败"
            exit 1
        fi
    else
        echo "已取消数据库重置"
        exit 1
    fi
fi

# 运行种子数据
echo "🌱 导入种子数据..."
if ! docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma db seed; then
    echo "❌ 种子数据导入失败"
    exit 1
fi

echo
echo "=================================================="
echo "✅ 数据库初始化完成！"
echo "=================================================="
echo
echo "数据库信息:"
echo "- 数据库名称: clothing_capsule_db"
echo "- 数据库用户: postgres"
echo "- 数据库端口: 5432"
echo
echo "已创建的表:"
echo "- devices (设备信息)"
echo "- users (用户信息)"
echo "- categories (服装分类)"
echo "- clothes (服装信息)"
echo "- tasks (任务信息)"
echo "- wechat_messages (微信消息)"
echo
echo "已初始化的数据:"
echo "- 服装分类 (男装、女装、配饰及其子分类)"
echo "- 示例服装数据"
echo