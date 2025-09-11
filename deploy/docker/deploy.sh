#!/bin/bash
# Docker部署脚本 - 支持开发和生产环境

set -e

# 环境配置
ENV=${1:-"dev"}
COMPOSE_FILE="docker-compose.yml"

if [ "$ENV" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "🏭 生产环境部署模式"
else
    echo "🔧 开发环境部署模式"
fi

echo "🚀 开始部署 Clothing Space Capsule ($ENV环境)..."

# 环境检查
echo "🔍 执行环境检查..."
./deploy/docker/check-env.sh "$ENV"

# 创建必要的目录
echo "📁 创建目录结构..."
mkdir -p uploads logs/nginx logs/api data/uptime-kuma

# 设置文件权限
echo "🔒 设置文件权限..."
chmod -R 755 uploads
chmod -R 755 logs
chmod -R 755 data

# 生产环境特定配置
if [ "$ENV" = "prod" ]; then
    echo "🔐 生产环境配置..."
    
    # 检查SSL证书
    if [ ! -f "nginx/ssl/server.crt" ] || [ ! -f "nginx/ssl/server.key" ]; then
        echo "⚠️  SSL证书未找到，生成测试证书..."
        ./deploy/docker/generate-ssl.sh
    fi
    
    # 检查环境变量
    if [ ! -f "api-server/.env" ]; then
        echo "❌ 生产环境变量文件未配置"
        echo "请复制 api-server/.env.example 为 api-server/.env 并配置生产环境变量"
        exit 1
    fi
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose -f $COMPOSE_FILE down --remove-orphans

# 构建和启动容器
echo "🐳 构建和启动Docker容器..."
docker-compose -f $COMPOSE_FILE up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 检查服务状态
echo "🔍 检查服务状态..."
if docker-compose -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo "✅ 部署成功！"
    echo ""
    
    if [ "$ENV" = "prod" ]; then
        echo "🌐 生产环境访问地址:"
        echo "  - HTTPS服务: https://your-domain.com"
        echo "  - API服务: https://your-domain.com/api"
        echo "  - 健康检查: https://your-domain.com/api/health"
        echo "  - 监控面板: http://localhost:3001"
    else
        echo "🌐 开发环境访问地址:"
        echo "  - API服务: http://localhost:4001"
        echo "  - 健康检查: http://localhost:4001/api/health"
    fi
    
    echo ""
    echo "📋 常用命令:"
    echo "  - 查看日志: docker-compose -f $COMPOSE_FILE logs -f"
    echo "  - 停止服务: docker-compose -f $COMPOSE_FILE down"
    echo "  - 重启服务: docker-compose -f $COMPOSE_FILE restart"
    echo ""
    echo "📊 服务状态: docker-compose -f $COMPOSE_FILE ps"
else
    echo "❌ 部署失败，请检查日志: docker-compose -f $COMPOSE_FILE logs"
    exit 1
fi