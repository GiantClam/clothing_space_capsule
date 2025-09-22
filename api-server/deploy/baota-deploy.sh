#!/bin/bash

# 宝塔面板部署脚本
echo "🚀 开始宝塔面板部署..."

# 创建项目目录
PROJECT_DIR="/www/wwwroot/clothing-api"
LOG_DIR="/www/wwwroot/clothing-api/logs"
mkdir -p $PROJECT_DIR
mkdir -p $LOG_DIR

# 复制项目文件
echo "📦 复制项目文件..."
cp -r . $PROJECT_DIR/

# 进入项目目录
cd $PROJECT_DIR

# 设置权限
chmod -R 755 $PROJECT_DIR
chown -R www:www $PROJECT_DIR

# 安装依赖
echo "🔧 安装生产环境依赖..."
npm ci --only=production

# 生成Prisma客户端
echo "🔨 生成Prisma客户端..."
npx prisma generate

# 创建PM2配置
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

# 启动应用
echo "🚀 启动应用..."
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ 宝塔部署完成！"
echo "应用查看: http://your-domain.com:4001/health"