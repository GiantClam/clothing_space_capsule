#!/bin/bash

# 腾讯云部署脚本
echo "🚀 开始部署到腾讯云..."

# 设置环境变量
export NODE_ENV=production
export PORT=4001

# 安装依赖
echo "📦 安装生产环境依赖..."
npm ci --only=production

# 生成Prisma客户端
echo "🔧 生成Prisma客户端..."
npx prisma generate

# 运行数据库迁移
echo "📊 运行数据库迁移..."
npx prisma migrate deploy

# 启动应用（使用PM2管理）
echo "🚀 启动应用..."
npm run pm2:start

echo "✅ 部署完成！应用已在端口 4001 上运行"
echo "应用查看: http://localhost:4001/health"