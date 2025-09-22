# 腾讯云CVM部署完整指南

## 📋 部署前准备

### 1. 腾讯云账号准备
- 注册腾讯云账号
- 完成实名认证
- 确保账户余额充足

### 2. 购买CVM实例
- 推荐配置：
  - 实例类型：标准型S5.MEDIUM2（1核2GB）或更高
  - 操作系统：Ubuntu Server 20.04 LTS 64位
  - 系统盘：50GB SSD云硬盘
  - 公网带宽：1Mbps（按使用流量计费）

### 3. 安全组配置
在腾讯云控制台配置安全组规则，开放以下端口：
- 22（SSH）
- 80（HTTP）
- 443（HTTPS）
- 4001（API服务端口）

## 🚀 CVM环境配置

### 1. SSH连接到CVM

```bash
ssh ubuntu@your-server-ip
```

### 2. 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. 安装必要软件

```bash
# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装Docker
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 安装PM2
sudo npm install -g pm2

# 安装Git
sudo apt install git -y
```

### 4. 验证安装

```bash
node --version
npm --version
docker --version
docker-compose --version
pm2 --version
git --version
```

## 📦 项目部署

### 1. 克隆项目代码

```bash
cd /home/ubuntu
git clone https://github.com/GiantClam/clothing_space_capsule.git
cd clothing_space_capsule
```

### 2. 配置环境变量

```bash
# 进入API服务器目录
cd api-server

# 复制环境配置文件
cp .env.production.example .env

# 编辑环境变量
nano .env
```

在 `.env` 文件中配置以下关键变量：

```env
# 服务器配置
NODE_ENV=production
PORT=4001

# 数据库配置（使用腾讯云数据库或本地Docker）
DATABASE_URL="postgresql://username:password@localhost:5432/clothing_space_capsule?schema=public"

# JWT密钥（请使用强随机字符串）
JWT_SECRET="your-strong-jwt-secret-here"

# RunningHub API配置
RUNNINGHUB_API_KEY="your-runninghub-api-key"
RUNNINGHUB_BASE_URL="https://www.runninghub.cn"
SINGLE_ITEM_WORKFLOW_ID="your-single-item-workflow-id"
TOP_BOTTOM_WORKFLOW_ID="your-top-bottom-workflow-id"

# 微信公众号配置（可选）
WECHAT_APP_ID="your-wechat-app-id"
WECHAT_APP_SECRET="your-wechat-app-secret"
WECHAT_TOKEN="your-wechat-token"
WECHAT_ENCODING_AES_KEY="your-wechat-encoding-aes-key"

# 腾讯云COS配置（可选）
COS_SECRET_ID="your-cos-secret-id"
COS_SECRET_KEY="your-cos-secret-key"
COS_REGION="your-cos-region"
COS_BUCKET="your-cos-bucket"
```

### 3. 安装项目依赖

```bash
# 安装生产环境依赖
npm ci --only=production
```

### 4. 数据库配置

#### 方案一：使用Docker运行PostgreSQL（推荐）

```bash
# 启动数据库
npm run db:start

# 等待数据库启动（约30秒）
sleep 30

# 运行数据库迁移
npm run db:migrate

# 初始化种子数据
npm run db:seed
```

#### 方案二：使用腾讯云数据库TencentDB for PostgreSQL

1. 在腾讯云控制台创建PostgreSQL实例
2. 创建数据库和用户
3. 配置安全组允许CVM访问数据库
4. 更新 `.env` 文件中的 `DATABASE_URL`

### 5. 启动应用

```bash
# 生成Prisma客户端
npx prisma generate

# 使用PM2启动应用
npm run pm2:start
```

### 6. 配置Nginx反向代理

```bash
# 安装Nginx
sudo apt install nginx -y

# 创建Nginx配置文件
sudo nano /etc/nginx/sites-available/clothing-api
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/clothing-api /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

## 🔧 SSL证书配置（可选但推荐）

### 使用Let's Encrypt免费SSL证书

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 设置自动续期
sudo crontab -e
```

添加以下行到crontab：

```cron
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔄 自动化部署脚本

创建自动部署脚本：

```bash
# 创建部署脚本
nano /home/ubuntu/deploy.sh
```

添加以下内容：

```bash
#!/bin/bash

echo "🚀 开始部署服装空间胶囊API服务器..."

# 进入项目目录
cd /home/ubuntu/clothing_space_capsule

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 进入API服务器目录
cd api-server

# 安装依赖
echo "📦 安装依赖..."
npm ci --only=production

# 生成Prisma客户端
echo "🔧 生成Prisma客户端..."
npx prisma generate

# 重启应用
echo "🔄 重启应用..."
npm run pm2:restart

echo "✅ 部署完成！"
```

设置脚本权限：

```bash
chmod +x /home/ubuntu/deploy.sh
```

## 📊 监控和日志

### 查看应用状态

```bash
# 查看PM2状态
pm2 status

# 查看应用日志
pm2 logs clothing-space-capsule-api

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 设置日志轮转

```bash
# 创建logrotate配置
sudo nano /etc/logrotate.d/clothing-api
```

添加以下内容：

```conf
/home/ubuntu/clothing_space_capsule/api-server/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 🔒 安全加固

### 1. 防火墙配置

```bash
# 启用UFW防火墙
sudo ufw enable

# 允许SSH、HTTP、HTTPS
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# 查看状态
sudo ufw status
```

### 2. SSH安全配置

编辑SSH配置：

```bash
sudo nano /etc/ssh/sshd_config
```

修改以下配置：

```conf
Port 22  # 建议修改为其他端口
PermitRootLogin no
PasswordAuthentication no  # 使用SSH密钥登录
```

重启SSH服务：

```bash
sudo systemctl restart ssh
```

### 3. 定期备份

创建备份脚本：

```bash
nano /home/ubuntu/backup.sh
```

```bash
#!/bin/bash

# 备份脚本
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
PROJECT_DIR="/home/ubuntu/clothing_space_capsule"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份项目代码
tar -czf $BACKUP_DIR/code_backup_$DATE.tar.gz -C $PROJECT_DIR .

# 备份数据库
docker exec clothing-space-capsule-db pg_dump -U postgres clothing_space_capsule > $BACKUP_DIR/db_backup_$DATE.sql

echo "✅ 备份完成: $BACKUP_DIR"
```

设置定时任务：

```bash
# 编辑crontab
crontab -e

# 添加每日凌晨2点备份
0 2 * * * /home/ubuntu/backup.sh
```

## 🧪 验证部署

### 1. 检查应用状态

```bash
pm2 list
```

### 2. 检查健康检查接口

```bash
curl http://localhost:4001/health
```

### 3. 检查API接口

```bash
curl http://localhost:4001/api/clothes/categories
```

### 4. 检查Nginx代理

```bash
curl http://your-domain.com/health
```

## 🆘 常见问题和解决方案

### 1. 应用启动失败

查看PM2日志：

```bash
pm2 logs clothing-space-capsule-api
```

常见原因：
- 环境变量配置错误
- 数据库连接失败
- 端口被占用

### 2. 数据库连接失败

检查：
- DATABASE_URL配置是否正确
- 数据库服务是否运行
- 防火墙设置

### 3. 微信公众号功能异常

检查：
- 微信服务器配置是否正确
- 服务器是否可从外网访问
- WECHAT_TOKEN配置是否正确

### 4. RunningHub API调用失败

检查：
- RUNNINGHUB_API_KEY是否有效
- 工作流ID是否正确
- 网络连接是否正常

## 📈 性能优化建议

### 1. PM2集群模式

API服务器已配置为使用PM2集群模式，会根据CPU核心数启动多个实例。

### 2. 数据库优化

- 定期执行VACUUM和ANALYZE
- 添加适当的索引
- 监控慢查询

### 3. 缓存策略

考虑集成Redis进行数据缓存：
- 服装数据缓存
- 用户会话缓存
- API响应缓存

## 🔄 版本升级

### 1. 代码升级

```bash
# 拉取最新代码
cd /home/ubuntu/clothing_space_capsule
git pull origin main

# 进入API服务器目录
cd api-server

# 安装新依赖
npm ci --only=production

# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移（如有）
npx prisma migrate deploy

# 重启应用
npm run pm2:restart
```

### 2. 数据库迁移

在项目更新包含数据库模式变更时：

```bash
# 运行迁移
npx prisma migrate deploy

# 更新种子数据（如有需要）
npm run db:seed
```

## 📞 技术支持

如果在部署过程中遇到问题：

1. 检查日志文件获取详细错误信息
2. 确认所有环境变量已正确配置
3. 验证数据库连接和权限
4. 联系技术支持团队

## 📝 附录

### 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| NODE_ENV | 运行环境 | production |
| PORT | 服务端口 | 4001 |
| DATABASE_URL | 数据库连接URL | postgresql://user:pass@host:port/db |
| JWT_SECRET | JWT密钥 | your-jwt-secret |
| RUNNINGHUB_API_KEY | RunningHub API密钥 | rh_xxxxxxxx |
| WECHAT_APP_ID | 微信公众号AppID | wx_xxxxxxxx |
| COS_SECRET_ID | 腾讯云COS密钥ID | AKIDxxxxxx |