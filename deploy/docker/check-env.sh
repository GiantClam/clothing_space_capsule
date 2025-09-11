#!/bin/bash
# 环境检查脚本 - 检查部署环境配置

set -e

ENV=${1:-"dev"}

echo "🔍 检查 $ENV 环境配置..."

# 检查操作系统
echo "🖥️  操作系统: $(uname -s) $(uname -m)"
echo "💾 内存: $(free -h | awk '/Mem:/{print $2}')"
echo "💿 磁盘空间: $(df -h / | awk 'NR==2{print $4}')"

# 检查Docker版本
if command -v docker &> /dev/null; then
    echo "🐳 Docker版本: $(docker --version | cut -d' ' -f3 | tr -d ',')"
else
    echo "❌ Docker未安装"
    exit 1
fi

# 检查Docker Compose版本
if command -v docker-compose &> /dev/null; then
    echo "📦 Docker Compose版本: $(docker-compose --version | cut -d' ' -f3 | tr -d ',')"
else
    echo "❌ Docker Compose未安装"
    exit 1
fi

# 检查Docker服务状态
if ! docker info &> /dev/null; then
    echo "❌ Docker服务未运行"
    exit 1
fi

# 环境特定检查
if [ "$ENV" = "prod" ]; then
    echo "🏭 生产环境检查:"
    
    # 检查端口占用
    for port in 80 443 4001; do
        if netstat -tuln | grep ":$port " > /dev/null; then
            echo "⚠️  端口 $port 已被占用"
        fi
    done
    
    # 检查必要的目录
    for dir in uploads logs nginx/ssl; do
        if [ ! -d "$dir" ]; then
            echo "⚠️  目录 $dir 不存在，将在部署时创建"
        fi
    done
    
    # 检查环境变量文件
    if [ ! -f "api-server/.env" ]; then
        echo "❌ 生产环境变量文件未配置"
        echo "请执行: cp api-server/.env.example api-server/.env"
        echo "并配置生产环境所需的变量值"
        exit 1
    fi
    
    # 检查SSL证书（可选）
    if [ -f "nginx/ssl/server.crt" ] && [ -f "nginx/ssl/server.key" ]; then
        echo "✅ SSL证书已配置"
    else
        echo "⚠️  SSL证书未配置，将使用测试证书"
    fi
else
    echo "🔧 开发环境检查:"
    echo "✅ 环境检查通过"
fi

echo "✅ $ENV 环境检查完成"