#!/bin/bash
# CloudStudio 部署脚本

set -e  # 遇到错误立即退出

echo "🚀 开始部署 Clothing Space Capsule API 服务器"

# 检查 Node.js 版本
echo "📋 环境信息:"
node --version
npm --version

# 进入API服务器目录
cd api-server

# 安装依赖
echo "📦 安装依赖..."
npm install

# 环境变量配置检查
echo "🔍 检查环境变量配置..."
if [ ! -f .env ]; then
    echo "⚠️  警告: 未找到 .env 文件"
    
    # 检查是否有环境变量模板
    if [ -f ../.cloudstudio/env.template ]; then
        echo "📝 发现环境变量模板，请复制并配置:"
        echo "   cp ../.cloudstudio/env.template .env"
        echo "   # 然后编辑 .env 文件填写实际配置值"
    else
        echo "❌ 错误: 缺少环境变量配置"
        echo "💡 请创建 .env 文件并配置以下必需环境变量:"
        echo "   - DATABASE_URL (数据库连接字符串)"
        echo "   - JWT_SECRET (JWT密钥)"
        echo "   - COS_SECRET_ID, COS_SECRET_KEY (腾讯云COS配置)"
        echo "   - 其他业务相关配置"
        exit 1
    fi
else
    # 验证必需环境变量
    REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^$var=" .env; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo "❌ 错误: .env 文件中缺少以下必需环境变量:"
        for var in "${MISSING_VARS[@]}"; do
            echo "   - $var"
        done
        exit 1
    fi
    
    echo "✅ 环境变量配置检查通过"
fi

# 数据库迁移（如果使用Prisma）
if [ -f prisma/schema.prisma ]; then
    echo "🗄️  执行数据库迁移..."
    npx prisma generate
    npx prisma migrate deploy
fi

# 启动应用
echo "🔧 启动应用..."
npm start