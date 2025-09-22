#!/bin/bash

echo "=================================================="
echo "服装空间胶囊 API 服务器 - 宝塔面板简化部署"
echo "=================================================="

# 获取当前目录作为项目目录
PROJECT_DIR=$(pwd)
LOG_DIR="$PROJECT_DIR/logs"

echo "当前项目目录: $PROJECT_DIR"

# 检查必要文件
if [ ! -f "package.json" ]; then
    echo "错误: 未找到package.json文件，请确保在项目根目录中运行此脚本"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo "警告: 未找到.env.production文件，请确保已创建环境变量配置文件"
    echo "可以复制 deploy/.env.baota.example 为 .env.production 并填写实际值"
    echo
fi

# 创建日志目录
if [ ! -d "$LOG_DIR" ]; then
    echo "创建日志目录..."
    mkdir -p "$LOG_DIR"
fi

# 安装生产环境依赖
echo "安装生产环境依赖..."
npm ci --only=production
if [ $? -ne 0 ]; then
    echo "错误: 依赖安装失败"
    exit 1
fi

# 生成Prisma客户端
echo "生成Prisma客户端..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "错误: Prisma客户端生成失败"
    exit 1
fi

# 创建PM2配置（如果不存在）
if [ ! -f "ecosystem.config.js" ]; then
    echo "创建PM2配置文件..."
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'clothing-space-capsule-api',
      script: './src/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      combine_logs: true,
      merge_logs: true
    }
  ]
};
EOF
fi

# 检查PM2是否已安装
echo "检查PM2..."
npm list -g pm2 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "安装PM2..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "错误: PM2安装失败"
        exit 1
    fi
fi

# 启动应用
echo "启动应用..."
pm2 start ecosystem.config.js
if [ $? -ne 0 ]; then
    echo "错误: 应用启动失败"
    exit 1
fi

pm2 save
if [ $? -ne 0 ]; then
    echo "警告: PM2配置保存失败"
fi

echo
echo "=================================================="
echo "✅ 应用部署完成！"
echo "=================================================="
echo
echo "查看应用状态: pm2 status"
echo "查看日志: pm2 logs"
echo "应用健康检查: http://localhost:4001/health"
echo
echo "如果需要使用Docker运行数据库等服务，请运行:"
echo "docker-compose -f deploy/docker-compose.baota.yml up -d"
echo