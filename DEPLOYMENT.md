# Clothing Space Capsule 部署指南

## 📋 项目概述

Clothing Space Capsule 是一个服装空间胶囊管理系统，包含：
- Node.js API 服务器
- Docker 容器化部署
- Nginx 反向代理
- 生产环境就绪配置

## 🚀 快速开始

### 开发环境部署

```bash
# 1. 克隆项目
git clone https://github.com/GiantClam/clothing_space_capsule.git
cd clothing_space_capsule

# 2. 安装依赖
cd api-server
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置数据库和其他设置

# 4. 启动开发服务器
npm run dev
```

### Docker 开发环境

```bash
# 使用 Docker Compose 启动所有服务
./deploy/docker/deploy.sh dev
```

## 🏭 生产环境部署

### 选项1: Docker 生产环境（推荐）

```bash
# 1. 配置生产环境变量
cp api-server/.env.example api-server/.env
# 编辑 api-server/.env 配置生产环境设置

# 2. 生成SSL证书（或使用真实证书）
./deploy/docker/generate-ssl.sh

# 3. 部署生产环境
./deploy/docker/deploy.sh prod
```

### 选项2: 腾讯云服务器部署

#### 服务器初始化

```bash
# 在腾讯云服务器上运行初始化脚本
curl -sSL https://raw.githubusercontent.com/GiantClam/clothing_space_capsule/main/deploy/docker/setup-server.sh | bash
```

#### 手动部署步骤

1. **登录服务器**
   ```bash
   ssh deploy@your-server-ip
   ```

2. **克隆项目**
   ```bash
   git clone https://github.com/GiantClam/clothing_space_capsule.git
   cd clothing_space_capsule
   ```

3. **配置环境**
   ```bash
   cp api-server/.env.example api-server/.env
   # 配置生产环境变量
   ```

4. **部署**
   ```bash
   ./deploy/docker/deploy.sh prod
   ```

## 🔧 环境配置

### 环境变量说明

编辑 `api-server/.env` 文件：

```env
# 数据库配置
DATABASE_URL="mysql://username:password@host:3306/database"

# 服务器配置
PORT=4001
NODE_ENV=production

# 文件上传
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# 安全配置
JWT_SECRET=your-jwt-secret-key
CORS_ORIGIN=https://your-domain.com
```

### SSL 证书配置

1. **使用 Let's Encrypt**（生产环境推荐）：
   ```bash
   # 安装 certbot
   sudo apt install certbot python3-certbot-nginx

   # 获取证书
   sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com
   ```

2. **配置 Nginx**：
   更新 `nginx/nginx.conf` 中的证书路径：
   ```nginx
   ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
   ```

## 📊 监控和维护

### 服务管理

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 停止服务
docker-compose -f docker-compose.prod.yml down
```

### 健康检查

```bash
# API健康检查
curl https://your-domain.com/api/health

# 监控面板
# 访问 http://your-server-ip:3001 设置监控
```

### 备份和恢复

```bash
# 备份数据库
docker exec -t clothing-space-capsule-db pg_dump -U postgres database > backup.sql

# 备份上传文件
tar -czf uploads-backup.tar.gz uploads/
```

## 🔒 安全配置

### 防火墙设置

```bash
# 只开放必要端口
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 定期更新

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 更新Docker镜像
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 🐛 故障排除

### 常见问题

1. **端口冲突**：
   ```bash
   # 检查端口占用
   netstat -tuln | grep :80
   ```

2. **Docker 权限问题**：
   ```bash
   # 将用户加入docker组
   sudo usermod -aG docker $USER
   ```

3. **内存不足**：
   ```bash
   # 增加swap空间
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### 日志查看

```bash
# 查看API日志
docker-compose logs api-server

# 查看Nginx日志
docker-compose logs nginx

# 实时日志监控
docker-compose logs -f
```

## 📞 支持

- 📧 邮箱: your-email@example.com
- 🐛 Issues: https://github.com/GiantClam/clothing_space_capsule/issues
- 📖 文档: https://github.com/GiantClam/clothing_space_capsule/wiki

## 📄 许可证

本项目基于 MIT 许可证开源。

---

**最后更新**: 2025年1月11日
**版本**: v1.0.0