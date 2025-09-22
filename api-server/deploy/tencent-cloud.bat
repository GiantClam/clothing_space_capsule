@echo off
echo 🚀 开始部署到腾讯云...

REM 设置环境变量
set NODE_ENV=production
set PORT=4001

echo 📦 安装生产环境依赖...
npm ci --only=production

echo 🔧 生成Prisma客户端...
npx prisma generate

echo 📊 运行数据库迁移...
npx prisma migrate deploy

echo 🚀 启动应用...
npm run pm2:start

echo ✅ 部署完成！应用已在端口 4001 上运行
echo 查看应用: http://localhost:4001/health

pause