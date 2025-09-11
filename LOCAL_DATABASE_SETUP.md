# 本地数据库设置指南

## 🚀 快速开始

### 1. 启动本地数据库

```bash
# 进入 api-server 目录
cd api-server

# 启动数据库 (使用Docker Compose)
npm run db:start

# 或者直接运行
docker-compose -f ../docker-compose.db.yml up -d
```

### 2. 设置数据库结构

```bash
# 运行数据库迁移
npm run db:migrate

# 导入种子数据
npm run db:seed

# 或者使用一键设置
npm run db:setup
```

### 3. 验证数据库连接

```bash
# 检查数据库状态
npm run db:check

# 查看数据库容器状态
npm run db:status
```

## 📊 数据库信息

### 连接信息
- **主机**: localhost:5432
- **数据库**: clothing_space_capsule
- **用户名**: clothing_user
- **密码**: clothing_password

### 管理界面
- **pgAdmin**: http://localhost:5050
  - 邮箱: admin@clothing.com
  - 密码: admin123

## 🔧 常用命令

### 启动和停止
```bash
# 启动数据库
npm run db:start

# 停止数据库
npm run db:stop

# 查看状态
npm run db:status

# 查看日志
npm run db:logs
```

### 数据库管理
```bash
# 检查数据库完整性
npm run db:check

# 修复数据库问题
npm run db:fix

# 重置数据库 (谨慎使用)
npm run db:reset

# 一键设置 (启动 + 迁移 + 种子)
npm run db:setup
```

## 🐳 Docker Compose 配置

### 服务说明
- **postgres**: PostgreSQL 15 数据库
- **pgadmin**: 数据库管理界面

### 数据持久化
数据库数据保存在 `postgres_data` 卷中，即使容器重启数据也不会丢失。

### 端口映射
- PostgreSQL: 5432 → 5432
- pgAdmin: 5050 → 80

## 🛠️ 故障排除

### 1. Docker 未安装
```bash
# 安装 Docker Desktop
# Windows: https://docs.docker.com/desktop/install/windows-install/
# macOS: https://docs.docker.com/desktop/install/mac-install/
```

### 2. 端口冲突
如果端口 5432 或 5050 已被占用，修改 `docker-compose.db.yml` 中的端口映射。

### 3. 权限问题
```bash
# 确保 Docker 有足够权限
docker ps

# 如果权限不足，以管理员身份运行
```

### 4. 容器启动失败
```bash
# 查看详细日志
npm run db:logs

# 重新构建容器
docker-compose -f ../docker-compose.db.yml up --build
```

## 📝 环境配置

### 本地开发环境 (.env.local)
```bash
# 使用本地数据库配置
DATABASE_URL=postgresql://clothing_user:clothing_password@localhost:5432/clothing_space_capsule
```

### 生产环境
生产环境请使用真实的数据库服务，如云数据库或自建数据库集群。

## 🔄 数据备份

### 备份数据库
```bash
# 进入容器
docker exec -it clothing_capsule_db psql -U clothing_user -d clothing_space_capsule

# 或者使用 pg_dump
docker exec clothing_capsule_db pg_dump -U clothing_user clothing_space_capsule > backup.sql
```

### 恢复数据库
```bash
# 恢复备份
cat backup.sql | docker exec -i clothing_capsule_db psql -U clothing_user -d clothing_space_capsule
```

## 📈 性能优化

### 开发环境建议
- 使用足够的内存 (建议 4GB+)
- 启用 Docker 资源限制
- 定期清理无用镜像和容器

### 生产环境
- 使用专门的数据库服务器
- 配置数据库连接池
- 启用查询缓存和索引优化

---

**最后更新**: 2025年1月11日  
**维护者**: 系统管理员