# 数据库管理指南

## 📋 概述

本文档提供 Clothing Space Capsule 项目的数据库管理指南，包括数据库检查、修复、迁移和备份。

## 🚀 快速开始

### 1. 初始化数据库

```bash
# 进入 api-server 目录
cd api-server

# 安装依赖
npm install

# 运行数据库迁移（首次设置）
npm run db:migrate

# 导入种子数据
npm run db:seed
```

### 2. 检查数据库状态

```bash
# 检查数据库连接和完整性
npm run db:check

# 输出示例：
# ✅ 数据库连接正常
# ✅ 所有表都存在
# ✅ 索引完整
# 📊 数据记录: 设备(5), 分类(15), 衣服(20)
```

### 3. 修复数据库问题

```bash
# 自动修复常见数据库问题
npm run db:fix

# 强制重置数据库（谨慎使用）
npm run db:reset
```

## 🔧 数据库工具

### 1. 数据库检查工具 (`db:check`)

检查以下内容：
- ✅ 数据库连接
- ✅ 表结构完整性
- ✅ 索引完整性  
- ✅ 外键约束
- ✅ 数据记录统计
- ✅ 种子数据存在性

### 2. 数据库修复工具 (`db:fix`)

自动修复：
- 🔄 创建缺失的表
- 🔄 重建缺失的索引
- 🔄 导入缺失的种子数据
- 🔄 修复外键约束

### 3. 数据库重置 (`db:reset`)

**谨慎使用** - 这将：
- ❌ 删除所有数据
- 🔄 重新创建数据库结构
- 🌱 重新导入种子数据

## 🗄️ 数据库结构

### 主要数据表

| 表名 | 描述 | 记录数 |
|------|------|--------|
| `devices` | 设备信息 | ~ |
| `users` | 用户信息 | ~ |
| `categories` | 衣服分类 | 15+ |
| `clothes` | 衣服数据 | 20+ |
| `tasks` | AI任务 | ~ |
| `wechat_messages` | 微信消息 | ~ |

### 关键索引

```sql
-- 唯一索引
CREATE UNIQUE INDEX devices_mac_address_key ON devices(mac_address);
CREATE UNIQUE INDEX users_open_id_key ON users(open_id);
CREATE UNIQUE INDEX categories_name_parentId_key ON categories(name, parentId);
CREATE UNIQUE INDEX clothes_name_categoryId_key ON clothes(name, categoryId);
```

## 📊 数据完整性检查

### 定期检查项目

1. **表结构验证**
   ```bash
   npm run db:check
   ```

2. **数据一致性**
   - 分类层级关系
   - 外键约束完整性
   - 唯一性约束

3. **性能指标**
   - 表记录数量
   - 索引使用情况
   - 查询性能

### 检查频率

- **开发环境**: 每次启动前
- **测试环境**: 每日一次
- **生产环境**: 每周一次

## 🛠️ 故障排除

### 常见问题及解决方案

#### 1. 数据库连接失败

**症状**: `ECONNREFUSED` 错误
**解决方案**:
```bash
# 检查数据库服务
sudo systemctl status postgresql

# 检查环境变量
cat .env | grep DATABASE_URL

# 测试连接
psql ${DATABASE_URL}
```

#### 2. 表不存在

**症状**: `relation "table_name" does not exist`
**解决方案**:
```bash
# 运行迁移
npm run db:migrate

# 或者重置数据库
npm run db:reset
```

#### 3. 数据不一致

**症状**: 外键约束错误
**解决方案**:
```bash
# 检查并修复
npm run db:fix

# 或者重新导入数据
npm run db:reset && npm run db:seed
```

## 🔄 迁移管理

### 创建新迁移

```bash
# 1. 修改 Prisma schema
# 2. 创建迁移文件
npx prisma migrate dev --name add_new_feature

# 3. 应用迁移
npx prisma migrate deploy
```

### 回滚迁移

```bash
# 查看迁移历史
npx prisma migrate status

# 回滚到特定迁移
npx prisma migrate resolve --rolled-back "migration_name"
```

## 💾 备份和恢复

### 备份数据库

```bash
# 备份整个数据库
pg_dump ${DATABASE_URL} > backup_$(date +%Y%m%d).sql

# 备份特定表
pg_dump ${DATABASE_URL} -t devices -t users > backup_tables.sql
```

### 恢复数据库

```bash
# 从备份恢复
psql ${DATABASE_URL} < backup_20250111.sql

# 恢复后验证
npm run db:check
```

### 自动化备份脚本

```bash
#!/bin/bash
# 每日备份脚本
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${DATE}.sql"

pg_dump ${DATABASE_URL} > ${BACKUP_DIR}/${FILENAME}
gzip ${BACKUP_DIR}/${FILENAME}

# 保留最近7天备份
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +7 -delete
```

## 📈 性能优化

### 索引优化

```sql
-- 添加查询优化索引
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_device_id ON tasks(device_id);
CREATE INDEX IF NOT EXISTS idx_clothes_category_id ON clothes(category_id);
```

### 查询优化

定期分析慢查询：
```sql
-- 启用查询日志
ALTER DATABASE clothing_capsule_db SET log_min_duration_statement = 1000;

-- 分析慢查询
SELECT query, calls, total_time, rows 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

## 🚨 紧急恢复

### 数据库完全崩溃

1. **停止服务**
   ```bash
   docker-compose down
   ```

2. **从备份恢复**
   ```bash
   # 使用最新备份
   psql ${DATABASE_URL} < latest_backup.sql

   # 或者重新初始化
   npm run db:reset
   ```

3. **验证恢复**
   ```bash
   npm run db:check
   npm start
   ```

### 数据损坏

```bash
# 1. 检查损坏
npm run db:check

# 2. 尝试修复
npm run db:fix

# 3. 如果修复失败，从备份恢复
```

## 📝 最佳实践

### 开发环境

1. **每次拉取代码后**
   ```bash
   npm run db:migrate
   npm run db:check
   ```

2. **修改数据库结构后**
   ```bash
   npx prisma migrate dev --name your_change
   npm run db:check
   ```

### 生产环境

1. **部署前检查**
   ```bash
   npm run db:check
   ```

2. **定期维护**
   ```bash
   # 每周执行
   npm run db:check
   pg_dump ${DATABASE_URL} > weekly_backup.sql

   # 每月执行  
   npx prisma migrate status
   VACUUM ANALYZE;
   ```

## 🔗 相关资源

- [Prisma 文档](https://www.prisma.io/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [数据库设计最佳实践](https://www.prisma.io/dataguide)

---

**最后更新**: 2025年1月11日  
**维护者**: 系统管理员