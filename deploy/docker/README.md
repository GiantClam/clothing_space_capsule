# Docker 部署指南

## 前置要求

### 1. 服务器要求
- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **内存**: 至少 2GB RAM
- **存储**: 至少 20GB 可用空间
- **网络**: 开放端口 4001 (API服务)

### 2. 软件要求
```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 添加当前用户到docker组
sudo usermod -aG docker $USER
newgrp docker
```

## 快速开始

### 1. 准备服务器
```bash
# 登录服务器
ssh root@your-server-ip

# 创建项目目录
mkdir -p /opt/clothing-space-capsule
cd /opt/clothing-space-capsule
```

### 2. 部署应用
```bash
# 克隆项目代码
git clone https://github.com/GiantClam/clothing_space_capsule.git .
cd deploy/docker

# 配置环境变量
cp ../../api-server/.env.example ../../api-server/.env
# 编辑 ../../api-server/.env 文件，填写实际配置值

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

## 环境变量配置

### 必需配置
1. **JWT密钥**:
   ```bash
   JWT_SECRET=至少32位的随机字符串
   ```

2. **腾讯云COS**:
   - 登录[腾讯云控制台](https://console.cloud.tencent.com/cos)
   - 创建存储桶并获取密钥
   - 配置以下变量:
     ```bash
     COS_SECRET_ID=你的SecretId
     COS_SECRET_KEY=你的SecretKey
     COS_BUCKET=你的存储桶名称
     COS_REGION=ap-guangzhou
     ```

### 可选配置
根据实际需求配置微信小程序、RunningHub等服务。

## 管理服务

### 常用命令
```bash
# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs api-server

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 停止并删除所有资源
docker-compose down -v
```

### 服务更新
```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 或者只重启服务
docker-compose restart api-server
```

## 备份与恢复

### 数据库备份 (如果使用数据库)
```bash
# 备份数据库
docker exec postgres pg_dump -U username database > backup-$(date +%Y%m%d).sql

# 恢复数据库
cat backup.sql | docker exec -i postgres psql -U username database
```

### 文件备份
```bash
# 备份上传文件
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# 备份日志文件
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## 监控与维护

### 资源监控
```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 日志管理
```bash
# 设置日志轮转 (在/etc/logrotate.d/docker-container中)
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    copytruncate
}
```

## 安全配置

### 防火墙设置
```bash
# 安装ufw
sudo apt install ufw

# 配置防火墙
sudo ufw allow ssh
sudo ufw allow 4001
sudo ufw enable
```

### 非root用户运行
```bash
# 创建专用用户
sudo adduser deploy
sudo usermod -aG docker deploy

# 使用deploy用户部署
sudo su - deploy
```

### SSL证书配置 (推荐)
```nginx
# nginx配置示例
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 故障排除

### 常见问题

1. **端口冲突**:
   ```bash
   # 检查端口占用
   netstat -tlnp | grep 4001

   # 修改docker-compose.yml中的端口映射
   ports:
     - "新的端口:4001"
   ```

2. **权限问题**:
   ```bash
   # 修复文件权限
   sudo chown -R $USER:$USER uploads/
   sudo chown -R $USER:$USER logs/
   sudo chmod -R 755 uploads/
   sudo chmod -R 755 logs/
   ```

3. **内存不足**:
   ```bash
   # 增加swap空间
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile

   # 永久生效，在/etc/fstab中添加
   /swapfile none swap sw 0 0
   ```

4. **容器启动失败**:
   ```bash
   # 查看详细日志
   docker-compose logs api-server

   # 检查环境变量
   docker-compose config

   # 进入容器调试
   docker-compose exec api-server sh
   ```

### 获取帮助

如果遇到问题，请检查：
- Docker服务状态: `sudo systemctl status docker`
- 容器日志: `docker-compose logs`
- 资源使用: `docker stats`

## 性能优化

### 数据库优化 (如果使用)
```sql
-- 创建索引
CREATE INDEX idx_created_at ON your_table(created_at);

-- 优化查询
EXPLAIN ANALYZE YOUR_QUERY;
```

### 应用优化
```javascript
// 启用压缩
app.use(compression());

// 使用缓存
app.use(express.static('public', { maxAge: '1d' }));
```

### 监控告警
建议设置以下监控：
- CPU使用率 > 80%
- 内存使用率 > 85%
- 磁盘使用率 > 90%
- 服务响应时间 > 2s