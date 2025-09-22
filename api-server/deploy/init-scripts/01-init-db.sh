#!/bin/bash
# 数据库初始化脚本

echo "等待PostgreSQL启动..."
until pg_isready -U postgres -d clothing_capsule_db; do
  echo "PostgreSQL未就绪，等待5秒..."
  sleep 5
done

echo "PostgreSQL已启动，开始初始化..."

# 这里可以添加任何需要在数据库启动时运行的命令
# 例如创建扩展、设置权限等

echo "数据库初始化完成"