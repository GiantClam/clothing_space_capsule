# 腾讯云服务器部署指南

## 前置要求

1. **腾讯云服务器** (CentOS 7+/Ubuntu 18.04+)
2. **Docker** 和 **Docker Compose** 已安装
3. **Git** 已安装
4. 服务器开放端口：4001 (API服务)

## 快速开始

### 1. 服务器准备

```bash
# 登录服务器
ssh root@your-server-ip

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 创建项目目录
mkdir -p /opt/clothing-space-capsule
cd /opt/clothing-space-capsule
```

### 2. 部署应用

```bash
# 克隆项目代码
git clone https://github.com/GiantClam/clothing_space_capsule.git .
cd deploy/tencent-cloud

# 配置环境变量
cp env.template ../../api-server/.env
# 编辑 ../../api-server/.env 文件，填写实际配置值

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 3. 管理服务

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新服务（代码更新后）
git pull
docker-compose build --no-cache
docker-compose up -d
```

## 环境变量配置

### 必需配置

1. **数据库连接**:
   ```bash
   DATABASE_URL=postgresql://username:password@host:5432/database
   ```

2. **JWT密钥**:
   ```bash
   JWT_SECRET=至少32位的随机字符串
   ```

3. **腾讯云COS**:
   - 登录[腾讯云控制台](https://console.cloud.tencent.com/cos)
   - 创建存储桶并获取密钥

### 可选配置

根据实际需求配置微信小程序、RunningHub等服务。

## 安全建议

1. **使用非root用户**:
   ```bash
   adduser deploy
   usermod -aG docker deploy
   ```

2. **配置防火墙**:
   ```bash
   ufw allow 4001
   ufw enable
   ```

3. **使用HTTPS**:
   - 配置Nginx反向代理
   - 申请SSL证书

4. **定期备份**:
   ```bash
   # 备份数据库
   docker exec postgres pg_dump -U username database > backup.sql

   # 备份上传文件
   tar -czf uploads-backup.tar.gz uploads/
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

2. **数据库连接失败**:
   - 检查数据库服务是否运行
   - 验证连接字符串格式
   - 检查网络连通性

3. **权限问题**:
   ```bash
   # 修复文件权限
   chmod -R 755 uploads/
   chmod 600 api-server/.env
   ```

### 获取帮助

如果遇到问题，请检查：
- Docker服务状态: `systemctl status docker`
- 容器日志: `docker-compose logs`
- 资源使用: `docker stats`