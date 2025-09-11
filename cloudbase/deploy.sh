#!/bin/bash
# CloudBase 一键部署脚本

set -e  # 遇到错误立即退出

echo "🚀 开始部署到腾讯云CloudBase..."

# 检查是否已安装CloudBase CLI
if ! command -v tcb &> /dev/null; then
    echo "❌ 未安装CloudBase CLI，请先安装："
    echo "npm install -g @cloudbase/cli"
    echo "然后运行：tcb login"
    exit 1
fi

# 检查是否已登录
if ! tcb env list &> /dev/null; then
    echo "❌ 请先登录CloudBase："
    echo "tcb login"
    exit 1
fi

# 选择环境
echo "🌍 选择部署环境："
ENV_ID=$(tcb env list | grep -Eo 'env-[a-zA-Z0-9]+' | head -1)
if [ -z "$ENV_ID" ]; then
    echo "❌ 未找到可用环境，请先创建环境："
    echo "tcb env create"
    exit 1
fi

echo "📦 使用环境: $ENV_ID"

# 部署云函数
echo "📡 部署云函数..."
tcb functions deploy api-server --env $ENV_ID --path ./cloudbase/functions/api-server

# 部署静态网站（如果有）
if [ -d "./dist" ]; then
    echo "🌐 部署静态网站..."
    tcb hosting deploy ./dist --env $ENV_ID
fi

# 配置环境变量
echo "🔧 配置环境变量..."
if [ -f "./cloudbase/env.json" ]; then
    tcb env set --env $ENV_ID --config ./cloudbase/env.json
fi

echo "✅ 部署完成！"
echo "📊 查看部署状态：tcb functions list --env $ENV_ID"
echo "🌐 访问地址：tcb hosting detail --env $ENV_ID"