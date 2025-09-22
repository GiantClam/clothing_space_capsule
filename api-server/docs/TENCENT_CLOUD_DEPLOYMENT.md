# 腾讯云部署指南

## 📋 部署要求

### 系统环境
- Node.js v18.x 或更高版本
- PostgreSQL v13 或更高版本
- PM2 (进程管理器)
- Docker (用于数据库)

### 服务器配置
- 推荐配置: 2核CPU, 4GB内存
- 硬盘空间: 至少10GB可用空间
- 操作系统: Linux (推荐Ubuntu 20.04+) 或 Windows Server

## 🚀 部署步骤

### 1. 克隆代码

```bash
git clone https://github.com/GiantClam/clothing_space_capsule.git
cd clothing_space_capsule/api-server
```

### 2. 安装依赖

```bash
# 安装生产环境依赖
npm ci --only=production
```

### 3. 配置环境变量

创建 `.env` 文件并配置以下环境变量：

```env
# 服务器配置
NODE_ENV=production
PORT=4001

# 数据库配置
DATABASE_URL="postgresql://用户名:密码@localhost:5432/数据库名?schema=public"

# JWT密钥
JWT_SECRET="你的JWT密钥"

# RunningHub API配置
RUNNINGHUB_API_KEY="你的RunningHub API密钥"
RUNNINGHUB_BASE_URL="https://www.runninghub.cn"
SINGLE_ITEM_WORKFLOW_ID="单品工作流ID"
TOP_BOTTOM_WORKFLOW_ID="组合工作流ID"

# 微信公众号配置
WECHAT_APP_ID="你的微信公众号AppID"
WECHAT_APP_SECRET="你的微信公众号AppSecret"
WECHAT_TOKEN="你的微信公众号Token"
WECHAT_ENCODING_AES_KEY="你的微信公众号EncodingAESKey"

# COS配置（可选）
COS_SECRET_ID="你的腾讯云COS Secret ID"
COS_SECRET_KEY="你的腾讯云COS Secret Key"
COS_REGION="你的COS区域"
COS_BUCKET="你的COS存储桶"
```

### 4. 数据库初始化

```bash
# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate deploy

# 初始化种子数据
npm run db:seed
```

### 5. 启动应用

```bash
# 使用PM2启动应用
npm run pm2:start
```

### 6. 配置Nginx反向代理（可选）

创建Nginx配置文件 `/etc/nginx/sites-available/clothing-api`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

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
sudo ln -s /etc/nginx/sites-available/clothing-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔄 PM2管理命令

```bash
# 查看应用状态
npm run pm2:status

# 查看日志
npm run pm2:logs

# 重启应用
npm run pm2:restart

# 停止应用
npm run pm2:stop
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

应该返回类似以下内容：

```json
{
  "status": "OK",
  "timestamp": "2025-09-22T10:00:00.000Z",
  "uptime": "120s"
}
```

### 3. 检查API接口

```bash
curl http://localhost:4001/api/clothes/categories
```

## 🔧 故障排除

### 1. 数据库连接失败

- 检查 `DATABASE_URL` 配置是否正确
- 确保PostgreSQL服务正在运行
- 检查防火墙设置

### 2. RunningHub API调用失败

- 检查 `RUNNINGHUB_API_KEY` 是否有效
- 验证工作流ID是否正确
- 检查网络连接

### 3. 微信公众号功能异常

- 检查微信公众号配置是否正确
- 验证服务器是否能被微信服务器访问
- 检查SSL证书配置

### 4. 应用启动失败

- 查看PM2日志: `pm2 logs`
- 检查环境变量配置
- 确认端口未被占用

## 📊 监控和日志

### 日志文件位置

- PM2错误日志: `logs/pm2-err.log`
- PM2输出日志: `logs/pm2-out.log`
- 组合日志: `logs/pm2-combined.log`

### 查看实时日志

```bash
pm2 logs clothing-space-capsule-api
```

## 🔒 安全建议

1. 使用HTTPS加密传输
2. 定期更新依赖包
3. 限制数据库访问权限
4. 使用强密码和密钥
5. 定期备份数据库
6. 配置防火墙规则

## 🔄 自动化部署

可以使用以下脚本进行自动化部署：

### Linux/macOS

```bash
# 进入项目目录
cd /path/to/clothing_space_capsule/api-server

# 拉取最新代码
git pull origin main

# 安装依赖
npm ci --only=production

# 生成Prisma客户端
npx prisma generate

# 重启应用
npm run pm2:restart
```

### Windows

使用 `deploy\tencent-cloud.bat` 脚本。

## 📞 技术支持

如果在部署过程中遇到问题：

1. 检查日志文件获取详细错误信息
2. 确认所有环境变量已正确配置
3. 验证数据库连接和权限
4. 联系技术支持团队