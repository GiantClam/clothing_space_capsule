#!/bin/bash

# 服装空间胶囊部署脚本

set -e

echo "🚀 开始部署服装空间胶囊系统..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，从示例文件创建..."
    cp env.example .env
    echo "📝 请编辑 .env 文件，配置必要的环境变量"
    echo "🔧 特别是以下配置项："
    echo "   - API_SERVER_URL: API服务器地址"
    echo "   - WECHAT_APP_ID: 微信公众号 AppID"
    echo "   - WECHAT_APP_SECRET: 微信公众号 AppSecret"
    echo ""
    read -p "配置完成后按 Enter 继续..."
fi

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose down

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 服务信息："
echo "   - 本地服务器: http://localhost:3000"
echo ""
echo "🔧 管理命令："
echo "   - 查看日志: docker-compose logs -f"
echo "   - 停止服务: docker-compose down"
echo "   - 重启服务: docker-compose restart"
echo ""
echo "📱 客户端配置："
echo "   - 确保客户端配置中的 API Server 地址为外部独立部署的API服务器地址"
echo "   - 确保客户端配置中的本地服务器地址为: http://localhost:3000"
echo ""
echo "🎉 系统已准备就绪，可以开始使用！"