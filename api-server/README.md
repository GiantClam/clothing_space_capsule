# 服装空间胶囊 API 服务器

这是服装空间胶囊项目的 API 服务器，提供设备认证、微信集成、衣服管理、任务处理等功能。

## 功能特性

- 🔐 **设备认证**：基于 MAC 地址的设备合法性验证
- 📱 **微信集成**：微信公众号关注验证和消息推送
- 👗 **衣服管理**：衣服分类、列表、详情管理
- 📸 **图片上传**：支持用户照片上传到腾讯云 COS
- 🤖 **AI 任务**：与 RunningHub 集成，处理虚拟试衣任务
- 🛒 **电商集成**：有赞电商小程序商品链接推送
- 🐳 **Docker 部署**：支持容器化部署

## 技术栈

- **Node.js** + **Express**：后端框架
- **PostgreSQL** + **Prisma**：数据库和 ORM
- **JWT**：身份认证
- **腾讯云 COS**：图片存储
- **Docker**：容器化部署

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 15+
- Docker (可选)

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境变量文件：
```bash
cp env.example .env
```

2. 编辑 `.env` 文件，配置必要的环境变量：

```env
# 服务器配置
PORT=4001
NODE_ENV=development

# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/clothing_capsule_db"

# JWT 配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 微信公众号配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
WECHAT_TOKEN=your_wechat_token

# RunningHub API 配置
RUNNINGHUB_API_URL=https://runninghub.cn/api
RUNNINGHUB_API_KEY=your_runninghub_api_key
RUNNINGHUB_WEBHOOK_SECRET=your_webhook_secret

# 腾讯云 COS 配置
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_REGION=ap-beijing
COS_BUCKET=clothing-capsule-images

# 有赞电商配置
YOUZAN_CLIENT_ID=your_youzan_client_id
YOUZAN_CLIENT_SECRET=your_youzan_client_secret

# API 服务器配置
API_BASE_URL=http://localhost:3001
```

### 数据库初始化

```bash
# 生成 Prisma 客户端
npm run db:generate

# 运行数据库迁移
npm run db:migrate

# 填充示例数据
npm run db:seed
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## Docker 部署

### 使用 Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 单独构建 API 服务

```bash
# 构建镜像
npm run docker:build

# 运行容器
npm run docker:run
```

## API 接口文档

### 认证接口

#### 设备登录
```
POST /api/auth/device
Content-Type: application/json

{
  "macAddress": "00:11:22:33:44:55",
  "deviceName": "设备名称"
}
```

#### 获取设备信息
```
GET /api/auth/device
Authorization: Bearer <token>
```

### 微信接口

#### 生成关注二维码
```
POST /api/wechat/qrcode
Content-Type: application/json

{
  "deviceId": "device_id"
}
```

#### 检查关注状态
```
GET /api/wechat/status/:deviceId
```

### 衣服接口

#### 获取分类列表
```
GET /api/clothes/categories
```

#### 获取衣服列表
```
GET /api/clothes/list?categoryId=xxx&page=1&limit=20&search=关键词
```

#### 获取衣服详情
```
GET /api/clothes/:id
```

### 上传接口

#### 上传照片
```
POST /api/upload/photo
Authorization: Bearer <token>
Content-Type: multipart/form-data

photo: <file>
```

#### 获取照片列表
```
GET /api/upload/photos
Authorization: Bearer <token>
```

### 任务接口

#### 创建试穿任务
```
POST /api/tasks/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "clothesId": "clothes_id",
  "userPhotoUrl": "https://example.com/photo.jpg"
}
```

#### 查询任务状态
```
GET /api/tasks/:taskId
Authorization: Bearer <token>
```

#### 获取任务列表
```
GET /api/tasks?page=1&limit=20&status=COMPLETED
Authorization: Bearer <token>
```

## 数据库结构

### 主要表结构

- **devices**：设备表
- **users**：用户表
- **categories**：衣服分类表
- **clothes**：衣服表
- **tasks**：任务表
- **wechat_messages**：微信消息表

详细结构请参考 `prisma/schema.prisma` 文件。

## 开发指南

### 项目结构

```
api-server/
├── src/
│   ├── controllers/     # 控制器
│   ├── services/        # 业务逻辑
│   ├── models/          # 数据模型
│   ├── routes/          # 路由定义
│   ├── middleware/      # 中间件
│   ├── utils/           # 工具函数
│   └── app.js           # 应用入口
├── prisma/              # 数据库相关
├── docker/              # Docker 配置
├── config/              # 配置文件
└── package.json
```

### 添加新功能

1. 在 `src/routes/` 中创建路由文件
2. 在 `src/controllers/` 中创建控制器
3. 在 `src/services/` 中实现业务逻辑
4. 更新 `src/app.js` 注册新路由

### 数据库操作

使用 Prisma 进行数据库操作：

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 查询
const users = await prisma.user.findMany();

// 创建
const user = await prisma.user.create({
  data: { name: 'John' }
});

// 更新
const updatedUser = await prisma.user.update({
  where: { id: userId },
  data: { name: 'Jane' }
});
```

## 部署说明

### 生产环境配置

1. 设置 `NODE_ENV=production`
2. 配置强密码的数据库连接
3. 设置安全的 JWT 密钥
4. 配置正确的域名和 HTTPS
5. 设置适当的资源限制

### 监控和日志

- 健康检查：`GET /health`
- 使用 `morgan` 记录访问日志
- 建议集成日志收集系统

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `DATABASE_URL` 配置
   - 确认数据库服务运行正常

2. **微信接口调用失败**
   - 检查 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`
   - 确认微信公众号配置正确

3. **COS 上传失败**
   - 检查腾讯云 COS 配置
   - 确认存储桶权限设置

4. **RunningHub 集成失败**
   - 检查 API 密钥和 URL
   - 确认网络连接正常

## 许可证

ISC License