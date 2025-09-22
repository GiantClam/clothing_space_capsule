#!/bin/bash
# 数据库迁移脚本

echo "等待API服务启动..."
sleep 10

echo "运行数据库迁移..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "数据库迁移成功"
else
    echo "数据库迁移失败"
    exit 1
fi

echo "运行种子数据..."
npx prisma db seed

if [ $? -eq 0 ]; then
    echo "种子数据导入成功"
else
    echo "种子数据导入失败"
    exit 1
fi

echo "数据库初始化和迁移完成"