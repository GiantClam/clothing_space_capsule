# 服装空间胶囊 API 服务器

这是一个基于 Node.js + Express + Prisma 的 API 服务器，为虚拟试衣应用提供后端服务。

## 功能特性

- 用户设备认证和管理
- 服装数据管理
- 照片上传和处理
- RunningHub AI 试衣任务管理
- 微信公众号集成
- 腾讯云 COS 存储集成

## 技术栈

- Node.js 18+
- Express.js
- Prisma ORM
- PostgreSQL
- 腾讯云 COS
- 微信公众号 API
- RunningHub API

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 设置环境变量（复制 .env.example 为 .env 并填写配置）
cp .env.example .env

# 启动数据库（使用 Docker）
npm run db:start

# 运行数据库迁移
npm run db:migrate

# 运行种子数据
npm run db:seed

# 启动开发服务器
npm run dev
```

### 生产环境部署

#### 方案一：直接部署（推荐用于腾讯云CVM）

```bash
# 安装PM2（如果尚未安装）
npm install -g pm2

# 复制生产环境配置
cp .env.production.example .env.production

# 编辑配置文件，填写实际值
nano .env.production

# 安装依赖
npm ci --only=production

# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate deploy

# 启动应用
npm run pm2:start
```

#### 方案二：Docker部署

```bash
# 构建Docker镜像
npm run docker:build

# 复制生产环境配置
cp .env.production.example .env.production

# 编辑配置文件，填写实际值
nano .env.production

# 启动服务
docker-compose -f docker-compose.prod.yml up -d
```

#### 方案三：宝塔面板部署

详细部署说明请参考 [宝塔面板部署指南](deploy/BAOTA_DEPLOYMENT.md)

```bash
# 进入部署目录
cd deploy

# Linux环境下运行部署脚本
chmod +x baota-deploy.sh
./baota-deploy.sh

# Windows环境下运行部署脚本
baota-deploy.bat
```

更多部署细节请查看 [宝塔部署详细文档](docs/BAOTA_DEPLOYMENT_GUIDE.md)

#### 方案四：腾讯云一键部署

详细部署说明请参考 [腾讯云部署指南](docs/TENCENT_CLOUD_DEPLOYMENT.md)

```bash
# 进入部署目录
cd deploy

# Linux环境下运行部署脚本
chmod +x tencent-cloud.sh
./tencent-cloud.sh

# Windows环境下运行部署脚本
tencent-cloud.bat
```

## 高并发支持

API服务器已配置为支持高并发：

1. **集群模式**：使用Node.js集群模块，根据CPU核心数启动多个工作进程
2. **负载均衡**：可配合Nginx实现负载均衡
3. **连接池**：Prisma数据库连接池优化
4. **缓存**：可集成Redis进行数据缓存

## 日志记录

所有日志都会记录在本地 `logs` 目录中：
- `app-YYYY-MM-DD.log`：应用日志
- `pm2-out.log`：PM2标准输出日志
- `pm2-err.log`：PM2错误日志

## 环境变量

请参考 `.env.example` 文件配置环境变量。

## API 文档

### 认证相关
- `POST /api/auth/device` - 设备认证
- `GET /api/auth/device` - 获取设备信息

### 服装相关
- `GET /api/clothes/categories` - 获取服装分类
- `GET /api/clothes/list` - 获取服装列表
- `GET /api/clothes/category/:categoryId` - 获取指定分类的服装
- `GET /api/clothes/:clothesId` - 获取服装详情

### 上传相关
- `POST /api/upload/photo` - 上传用户照片
- `GET /api/upload/photos` - 获取已上传的照片列表
- `DELETE /api/upload/photo/:fileName` - 删除照片

### 任务相关
- `POST /api/tasks/upload-photo` - 上传照片并创建任务
- `POST /api/tasks/start-tryon` - 开始试衣任务
- `GET /api/tasks/:taskId` - 获取任务状态
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks/:taskId/cancel` - 取消任务

### 微信相关
- `POST /api/wechat/qrcode` - 生成微信关注二维码
- `GET /api/wechat/status/:deviceId` - 检查微信关注状态
- `POST /api/wechat/download-qr` - 生成下载二维码
- `POST /api/wechat/callback` - 微信回调处理
- `POST /api/wechat/push-tryon-result` - 推送试装结果

### RunningHub相关
- `POST /api/runninghub/callback` - RunningHub回调处理

## 监控和维护

### 查看应用状态
```bash
npm run pm2:status
```

### 查看日志
```bash
npm run pm2:logs
```

### 重启应用
```bash
npm run pm2:restart
```

## 故障排除

### 数据库连接问题
1. 检查 `DATABASE_URL` 环境变量配置
2. 确保数据库服务正在运行
3. 检查防火墙设置

### 微信回调问题
1. 确保服务器可从外网访问
2. 检查微信公众号后台的服务器配置
3. 验证 `WECHAT_TOKEN` 配置正确

### RunningHub集成问题
1. 检查 `RUNNINGHUB_API_KEY` 配置
2. 确认工作流ID正确
3. 验证回调URL可访问

## 许可证

MIT