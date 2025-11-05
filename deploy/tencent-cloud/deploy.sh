#!/bin/bash
# 腾讯云服务器部署脚本

set -e  # 遇到错误立即退出

echo "🚀 开始部署到腾讯云服务器"

# 检查环境
echo "📋 环境检查:"
node --version
npm --version
docker --version
docker-compose --version

echo "⚠️  注意: API服务器已独立部署，此脚本仅用于客户端部署"

# 构建Docker镜像
echo "🐳 构建Docker镜像..."
docker build -t clothing-space-capsule-client .

# 启动服务
echo "🔧 启动服务..."
docker-compose up -d

echo "🎉 客户端部署完成!"
echo "📊 服务状态: docker-compose ps"
echo "📝 查看日志: docker-compose logs -f"
echo "🌐 访问地址: http://服务器IP"