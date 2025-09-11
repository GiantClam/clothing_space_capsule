#!/bin/bash

echo "🚀 正在启动 API Server..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装npm"
    exit 1
fi

# 进入API服务器目录
cd api-server || {
    echo "❌ api-server目录不存在"
    exit 1
}

# 检查package.json是否存在
if [ ! -f "package.json" ]; then
    echo "❌ package.json文件不存在"
    exit 1
fi

# 安装依赖（如果node_modules不存在）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，从.env.example复制..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ 已创建.env文件，请编辑配置后重新启动"
        echo "📝 需要配置的关键参数："
        echo "   - DATABASE_URL (数据库连接)"
        echo "   - JWT_SECRET (JWT密钥)"
        echo "   - RUNNINGHUB_API_KEY (RunningHub API密钥)"
        exit 1
    else
        echo "❌ .env.example文件也不存在"
        exit 1
    fi
fi

# 检查端口是否被占用
PORT=4002
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，尝试停止现有进程..."
    lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# 启动API服务器
echo "🌟 启动API服务器在端口 $PORT..."
node src/app.js &

# 记录进程ID
API_PID=$!
echo "✅ API服务器已启动 (PID: $API_PID)"
echo "📊 健康检查: http://localhost:$PORT/health"
echo "🛑 停止服务器: kill $API_PID"

# 等待服务器启动
sleep 3

# 检查服务器是否成功启动
if curl -s http://localhost:$PORT/health > /dev/null; then
    echo "✅ API服务器启动成功！"
else
    echo "❌ API服务器启动失败，请检查日志"
    exit 1
fi

# 保持脚本运行
wait $API_PID