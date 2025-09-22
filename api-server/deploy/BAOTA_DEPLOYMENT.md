# 宝塔面板部署指南

本文档详细说明如何在宝塔面板环境中部署服装空间胶囊API服务器，包括使用Docker运行PostgreSQL数据库和其他支持服务。

## 部署环境要求

- 宝塔面板 7.9+
- Docker 20.10+
- Docker Compose 1.29+
- 服务器配置：2核4GB RAM以上推荐

## 部署步骤

### 1. 准备工作

1. 登录宝塔面板
2. 确保已安装Docker管理器插件
3. 开放必要端口：
   - 80 (HTTP)
   - 443 (HTTPS)
   - 4001 (API服务)
   - 5432 (PostgreSQL)
   - 6379 (Redis)

### 2. 上传项目文件

1. 在宝塔面板中创建网站目录：
   ```
   /www/wwwroot/clothing-api
   ```
   
   Windows环境下目录为：
   ```
   C:\www\wwwroot\clothing-api
   ```

2. 将项目文件上传到该目录

### 3. 配置环境变量

1. 在项目根目录创建 `.env.production` 文件：
   ```bash
   # 复制示例配置
   cp deploy/.env.baota.example .env.production
   ```

2. 编辑 `.env.production` 文件，填写实际配置：
   ```env
   # JWT配置
   JWT_SECRET=your_secure_jwt_secret_here
   JWT_EXPIRES_IN=7d

   # 微信公众号配置
   WECHAT_APP_ID=your_wechat_app_id
   WECHAT_APP_SECRET=your_wechat_app_secret
   WECHAT_TOKEN=your_wechat_token

   # RunningHub配置
   RUNNINGHUB_API_KEY=your_runninghub_api_key
   RUNNINGHUB_BASE_URL=https://www.runninghub.cn

   # 腾讯云COS配置
   COS_SECRET_ID=your_cos_secret_id
   COS_SECRET_KEY=your_cos_secret_key
   COS_REGION=ap-guangzhou
   COS_BUCKET=your_cos_bucket

   # 数据库密码
   DB_PASSWORD=your_secure_database_password
   ```

### 4. 使用Docker Compose启动服务

1. 进入项目目录：
   ```bash
   cd /www/wwwroot/clothing-api
   ```
   
   Windows环境下：
   ```cmd
   cd C:\www\wwwroot\clothing-api
   ```

2. 启动所有服务：
   ```bash
   docker-compose -f deploy/docker-compose.baota.yml up -d
   ```

3. 等待服务启动完成（约1-2分钟）

### 5. 数据库初始化

首次部署时，需要初始化数据库表结构和种子数据。

#### 自动初始化（推荐）
如果使用完整的部署脚本，数据库会自动初始化：
```bash
# Linux环境下运行部署脚本
chmod +x deploy/baota-deploy.sh
./deploy/baota-deploy.sh

# Windows环境下运行部署脚本
deploy\baota-deploy.bat
```

#### 手动初始化
如果需要手动初始化数据库，可以使用专门的初始化脚本：
```bash
# Linux环境
chmod +x deploy/init-database.sh
./deploy/init-database.sh

# Windows环境
deploy\init-database.bat
```

或者手动执行以下命令：
```bash
# 检查数据库状态
docker-compose -f deploy/docker-compose.baota.yml exec db pg_isready -U postgres -d clothing_capsule_db

# 运行数据库迁移（创建表结构）
docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate deploy

# 运行种子数据（导入初始数据）
docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma db seed
```

### 6. 配置Nginx反向代理（可选）

1. 在宝塔面板中添加站点
2. 配置反向代理：
   - 目标URL: `http://localhost:4001`
   - 启用反向代理

### 7. 验证部署

1. 检查服务状态：
   ```bash
   docker-compose -f deploy/docker-compose.baota.yml ps
   ```

2. 查看API健康检查：
   ```bash
   curl http://localhost:4001/health
   ```

3. 查看日志：
   ```bash
   docker-compose -f deploy/docker-compose.baota.yml logs -f
   ```

## 服务管理命令

### 启动服务
```bash
docker-compose -f deploy/docker-compose.baota.yml up -d
```

### 停止服务
```bash
docker-compose -f deploy/docker-compose.baota.yml down
```

### 重启服务
```bash
docker-compose -f deploy/docker-compose.baota.yml restart
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose -f deploy/docker-compose.baota.yml logs -f

# 查看特定服务日志
docker-compose -f deploy/docker-compose.baota.yml logs -f api
```

### 更新应用
```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose -f deploy/docker-compose.baota.yml build

# 重启服务
docker-compose -f deploy/docker-compose.baota.yml up -d
```

## 数据库管理

### 备份数据库
```bash
docker-compose -f deploy/docker-compose.baota.yml exec db pg_dump -U postgres clothing_capsule_db > backup_$(date +%Y%m%d).sql
```

### 恢复数据库
```bash
docker-compose -f deploy/docker-compose.baota.yml exec -T db psql -U postgres clothing_capsule_db < backup_file.sql
```

### 连接数据库
```bash
docker-compose -f deploy/docker-compose.baota.yml exec db psql -U postgres -d clothing_capsule_db
```

### 重新初始化数据库
如果需要重新初始化数据库（警告：这将删除所有现有数据）：
```bash
# 重置数据库
docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate reset --force

# 重新运行迁移和种子数据
docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma migrate deploy
docker-compose -f deploy/docker-compose.baota.yml exec api npx prisma db seed
```

## 性能监控

### 查看资源使用情况
```bash
docker stats
```

### 查看应用状态
```bash
docker-compose -f deploy/docker-compose.baota.yml exec api pm2 status
```

## 故障排除

### 1. 服务无法启动
- 检查端口是否被占用
- 查看日志确认错误原因
- 确认环境变量配置正确

### 2. 数据库连接失败
- 检查数据库服务是否正常运行
- 确认数据库连接字符串配置正确
- 检查Docker网络连接

### 3. API接口返回502错误
- 检查API服务是否正常运行
- 查看Nginx配置是否正确
- 确认端口映射正确

### 4. 文件上传失败
- 检查uploads目录权限
- 确认磁盘空间充足
- 查看日志确认错误详情

### 5. 数据库初始化失败
- 检查数据库容器是否正常运行
- 确认数据库密码配置正确
- 查看数据库日志确认错误原因

## 安全建议

1. 定期更新Docker镜像
2. 使用强密码和密钥
3. 配置SSL证书启用HTTPS
4. 限制不必要的端口暴露
5. 定期备份数据库
6. 监控日志和异常访问

## 自动化部署

### 完整部署脚本（适用于全新环境）
项目提供了完整的自动化部署脚本，可直接运行：

Linux环境：
```bash
chmod +x deploy/baota-deploy.sh
./deploy/baota-deploy.sh
```

Windows环境：
```cmd
deploy\baota-deploy.bat
```

### 简化部署脚本（适用于已有环境）
如果项目文件已上传到服务器且环境已基本配置好，可以使用简化部署脚本：

Linux环境：
```bash
chmod +x deploy/baota-simple-deploy.sh
./deploy/baota-simple-deploy.sh
```

Windows环境：
```cmd
deploy\baota-simple-deploy.bat
```

## 联系支持

如有部署问题，请联系技术支持团队或查看项目文档。