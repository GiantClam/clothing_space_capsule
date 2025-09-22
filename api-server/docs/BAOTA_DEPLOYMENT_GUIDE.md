# 宝塔面板部署指南

本文档详细说明如何在宝塔面板环境中部署服装空间胶囊API服务器，包括使用Docker运行PostgreSQL数据库和其他支持服务。

## 目录

1. [部署环境要求](#部署环境要求)
2. [部署步骤](#部署步骤)
3. [服务管理](#服务管理)
4. [故障排除](#故障排除)
5. [安全建议](#安全建议)

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

2. 将项目文件上传到该目录

### 3. 配置环境变量

1. 在项目根目录创建 `.env.production` 文件：
   ```bash
   # 复制示例配置
   cp deploy/.env.baota.example .env.production
   ```

2. 编辑 `.env.production` 文件，填写实际配置

### 4. 使用Docker Compose启动服务

1. 进入项目目录：
   ```bash
   cd /www/wwwroot/clothing-api
   ```

2. 启动所有服务：
   ```bash
   docker-compose -f deploy/docker-compose.baota.yml up -d
   ```

### 5. 配置Nginx反向代理（可选）

1. 在宝塔面板中添加站点
2. 配置反向代理：
   - 目标URL: `http://localhost:4001`
   - 启用反向代理

## 服务管理

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

## 安全建议

1. 定期更新Docker镜像
2. 使用强密码和密钥
3. 配置SSL证书启用HTTPS
4. 限制不必要的端口暴露
5. 定期备份数据库
6. 监控日志和异常访问