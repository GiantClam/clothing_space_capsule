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

# 安装依赖
echo "📦 安装依赖..."
cd api-server
npm install

# 环境变量检查
echo "🔍 检查环境变量..."
if [ ! -f .env ]; then
    echo "❌ 错误: 缺少 .env 文件"
    echo "💡 请创建 .env 文件并配置以下环境变量:"
    echo "   - DATABASE_URL (数据库连接字符串)"
    echo "   - JWT_SECRET (JWT密钥)"
    echo "   - COS_SECRET_ID, COS_SECRET_KEY (腾讯云COS配置)"
    echo "   - 其他业务相关配置"
    exit 1
fi

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

echo "✅ 环境变量检查通过"

# 数据库迁移（如果使用Prisma）
if [ -f prisma/schema.prisma ]; then
    echo "🗄️  执行数据库迁移..."
    npx prisma generate
    npx prisma migrate deploy
fi

# 构建Docker镜像
echo "🐳 构建Docker镜像..."
docker build -t clothing-space-capsule-api .

# 启动服务
echo "🔧 启动服务..."
docker-compose up -d

echo "🎉 部署完成!"
echo "📊 服务状态: docker-compose ps"
echo "📝 查看日志: docker-compose logs -f"
echo "🌐 访问地址: http://服务器IP:4001"